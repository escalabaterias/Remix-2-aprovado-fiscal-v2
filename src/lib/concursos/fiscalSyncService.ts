/**
 * SERVIÇO DE SINCRONIZAÇÃO E AUTO-PROVISIONAMENTO DE EDITAIS FISCAIS
 *
 * Garante a persistência limpa, bulk insert e auto-provisionamento da árvore
 * completa de matérias e tópicos oficiais para o aluno no Supabase.
 */

import { supabase } from "@/integrations/supabase/client";
import { OFFICIAL_FISCAL_CONTESTS, type OfficialFiscalContest } from "./fiscalKnowledgeBase";
import { cleanupLegacyMockContests } from "./dbCleanupService";

export interface SyncResult {
  contestId: string;
  contestName: string;
  subjectsCount: number;
  topicsCount: number;
  contestTopicsCount: number;
}

/**
 * Clona ou provisiona um edital fiscal oficial para a conta do usuário.
 * Cria o concurso com user_id correto, garante as disciplinas e tópicos no banco e
 * cadastra todas as ligações em `contest_topics` via inserção em lote (bulk insert).
 */
export async function cloneOfficialFiscalContest(
  officialIdOrName: string,
  userId?: string,
): Promise<SyncResult> {
  const official = OFFICIAL_FISCAL_CONTESTS.find(
    (c) =>
      c.id === officialIdOrName ||
      c.name.toLowerCase().includes(officialIdOrName.toLowerCase()) ||
      c.organization.toLowerCase().includes(officialIdOrName.toLowerCase()),
  );

  if (!official) {
    throw new Error(`Edital fiscal '${officialIdOrName}' não encontrado no catálogo oficial.`);
  }

  // Obter usuário autenticado caso não passado
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const { data: authData } = await supabase.auth.getUser();
    effectiveUserId = authData?.user?.id;
  }

  if (!effectiveUserId) {
    throw new Error("Sessão expirada. Autentique-se para sincronizar o edital fiscal.");
  }

  // Executa rotina de limpeza de mocks e dados legados (UFGD, Porto Velho, etc)
  await cleanupLegacyMockContests(effectiveUserId);

  // 1. Criar ou buscar o concurso no banco com user_id
  const { data: existingContests } = await supabase
    .from("contests")
    .select("id, name, status, user_id")
    .eq("name", official.name)
    .limit(1);

  let targetContestId: string;

  if (existingContests && existingContests.length > 0) {
    targetContestId = existingContests[0].id;
    // Assegura status ativo, dados e user_id atualizados
    await supabase
      .from("contests")
      .update({
        user_id: effectiveUserId,
        status: "ativo",
        exam_board: official.examBoard,
        role_title: official.roleTitle,
        exam_date: official.examDate,
        organization: official.organization,
        area: official.area,
        description: official.description,
      })
      .eq("id", targetContestId);
  } else {
    const { data: newContest, error: contestError } = await supabase
      .from("contests")
      .insert({
        user_id: effectiveUserId,
        name: official.name,
        role_title: official.roleTitle,
        organization: official.organization,
        exam_board: official.examBoard,
        exam_date: official.examDate,
        status: "ativo",
        area: official.area,
        description: official.description,
      })
      .select("id")
      .single();

    if (contestError || !newContest) {
      throw new Error(
        `Erro ao criar concurso fiscal no banco: ${contestError?.message || "Falha no banco"}`,
      );
    }
    targetContestId = newContest.id;
  }

  // 2. Garantir Edital v1 na tabela `editais`
  const { data: existingEditais } = await supabase
    .from("editais")
    .select("id")
    .eq("contest_id", targetContestId)
    .limit(1);

  if (!existingEditais || existingEditais.length === 0) {
    await supabase.from("editais").insert({
      user_id: effectiveUserId,
      contest_id: targetContestId,
      version: "1",
      version_number: 1,
      is_rectification: false,
      status: "publicado",
      published_at: official.examDate,
      url: official.editalUrl || null,
      notes: `Edital de Referência Fiscal Oficial — Banca ${official.examBoard}`,
    });
  }

  // 3. Sincronização em Lote de Matérias (subjects)
  const subjectNames = official.subjects.map((s) => s.subjectName);
  const { data: existingSubjects } = await supabase
    .from("subjects")
    .select("id, name")
    .in("name", subjectNames);

  const subjectMap = new Map<string, string>();
  for (const s of existingSubjects ?? []) {
    subjectMap.set(s.name, s.id);
  }

  // Inserir matérias que faltam
  for (const subDef of official.subjects) {
    if (!subjectMap.has(subDef.subjectName)) {
      const { data: insertedSub, error: subErr } = await supabase
        .from("subjects")
        .insert({
          name: subDef.subjectName,
          area: subDef.area,
          is_quantitative: subDef.isQuantitative,
          created_by: effectiveUserId,
        })
        .select("id")
        .single();

      if (!subErr && insertedSub) {
        subjectMap.set(subDef.subjectName, insertedSub.id);
      }
    }
  }

  const allSubjectIds = Array.from(subjectMap.values());

  // 4. Sincronização em Lote de Tópicos (topics)
  const { data: existingTopics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in("subject_id", allSubjectIds);

  const topicKeyToId = new Map<string, string>(); // `${subjectId}::${topicName}` -> topicId
  for (const t of existingTopics ?? []) {
    topicKeyToId.set(`${t.subject_id}::${t.name}`, t.id);
  }

  let totalTopics = 0;
  // Criar tópicos que ainda não existem
  for (const subDef of official.subjects) {
    const subId = subjectMap.get(subDef.subjectName);
    if (!subId) continue;

    for (let pos = 0; pos < subDef.topics.length; pos++) {
      const topicDef = subDef.topics[pos];
      const key = `${subId}::${topicDef.name}`;
      totalTopics++;

      if (!topicKeyToId.has(key)) {
        const { data: insertedTopic, error: topicErr } = await supabase
          .from("topics")
          .insert({
            subject_id: subId,
            name: topicDef.name,
            kind: "topico",
            depth: 0,
            position: pos,
            created_by: effectiveUserId,
          })
          .select("id")
          .single();

        if (!topicErr && insertedTopic) {
          topicKeyToId.set(key, insertedTopic.id);
        }
      }
    }
  }

  // 5. Inserção em Lote (Bulk Insert) em `contest_topics`
  const { data: existingContestTopics } = await supabase
    .from("contest_topics")
    .select("id, topic_id")
    .eq("contest_id", targetContestId);

  const linkedTopicIds = new Set(
    (existingContestTopics ?? []).map((ct) => ct.topic_id).filter(Boolean),
  );

  const contestTopicsToInsert: {
    contest_id: string;
    subject_id: string;
    topic_id: string;
    user_id: string;
    weight: number;
    priority: number;
    relevance_score: number;
    incidence_score: number;
    notes: string;
    in_edital: boolean;
    is_studied: boolean;
  }[] = [];

  for (const subDef of official.subjects) {
    const subId = subjectMap.get(subDef.subjectName);
    if (!subId) continue;

    for (const topicDef of subDef.topics) {
      const topicId = topicKeyToId.get(`${subId}::${topicDef.name}`);
      if (!topicId) continue;

      if (!linkedTopicIds.has(topicId)) {
        contestTopicsToInsert.push({
          contest_id: targetContestId,
          subject_id: subId,
          topic_id: topicId,
          user_id: effectiveUserId,
          weight: topicDef.weight,
          priority: topicDef.priority,
          relevance_score: topicDef.incidenceScore,
          incidence_score: topicDef.incidenceScore,
          notes: `Alta incidência na banca ${official.examBoard} (${topicDef.incidenceScore}%)`,
          in_edital: true,
          is_studied: false,
        });
      }
    }
  }

  // Realizar bulk insert das ligações pendentes
  if (contestTopicsToInsert.length > 0) {
    const { error: bulkError } = await supabase
      .from("contest_topics")
      .insert(contestTopicsToInsert);

    if (bulkError) {
      console.error("Erro no bulk insert de contest_topics:", bulkError);
      // Fallback para inserção individual resiliente
      for (const item of contestTopicsToInsert) {
        await supabase.from("contest_topics").insert(item);
      }
    }
  }

  // 6. Desativar outros concursos que não sejam o selecionado para manter foco único
  await supabase
    .from("contests")
    .update({ status: "futuro" })
    .neq("id", targetContestId)
    .eq("user_id", effectiveUserId)
    .eq("status", "ativo");

  const totalContestTopicsCount =
    (existingContestTopics?.length ?? 0) + contestTopicsToInsert.length;

  return {
    contestId: targetContestId,
    contestName: official.name,
    subjectsCount: official.subjects.length,
    topicsCount: totalTopics,
    contestTopicsCount: totalContestTopicsCount,
  };
}

/**
 * Se um concurso existente na base estiver sem matérias vinculadas (ex: criado manualmente ou importado sem tópicos),
 * detecta o edital fiscal correspondente e auto-provisiona toda a árvore de tópicos imediatamente.
 */
export async function autoProvisionContestIfEmpty(
  contestId: string,
  userId?: string,
): Promise<boolean> {
  const { data: contest } = await supabase
    .from("contests")
    .select("id, name, organization, exam_board")
    .eq("id", contestId)
    .maybeSingle();

  if (!contest) return false;

  const { data: contestTopics } = await supabase
    .from("contest_topics")
    .select("id")
    .eq("contest_id", contestId)
    .limit(1);

  if (!contestTopics || contestTopics.length === 0) {
    // Busca no catálogo oficial o edital mais próximo
    const match =
      OFFICIAL_FISCAL_CONTESTS.find(
        (c) =>
          c.name.toLowerCase().includes(contest.name.toLowerCase()) ||
          contest.name.toLowerCase().includes(c.name.toLowerCase()) ||
          (contest.organization &&
            c.organization.toLowerCase().includes(contest.organization.toLowerCase())),
      ) || OFFICIAL_FISCAL_CONTESTS[0]; // Padrão SEFAZ-SP

    await cloneOfficialFiscalContest(match.id, userId);
    return true;
  }

  return false;
}

/**
 * Garante que a base do usuário esteja inicializada com pelo menos um concurso fiscal de ponta.
 * Elimina o risco de telas vazias ou dados quebrados.
 */
export async function ensureDefaultFiscalContext(userId?: string): Promise<string> {
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const { data: authData } = await supabase.auth.getUser();
    effectiveUserId = authData?.user?.id;
  }

  // Executa limpeza de legados
  if (effectiveUserId) {
    await cleanupLegacyMockContests(effectiveUserId);
  }

  let query = supabase.from("contests").select("id, name, status, exam_date").eq("status", "ativo");

  if (effectiveUserId) {
    query = query.eq("user_id", effectiveUserId);
  }

  const { data: activeContests } = await query.limit(1);

  if (activeContests && activeContests.length > 0) {
    // Garante que o concurso tenha conteúdo vinculado
    await autoProvisionContestIfEmpty(activeContests[0].id, effectiveUserId);
    return activeContests[0].id;
  }

  // Se não houver concurso ativo, provisiona o SEFAZ-SP (Auditor Fiscal)
  const result = await cloneOfficialFiscalContest("sefaz-sp-afre", effectiveUserId);
  return result.contestId;
}
