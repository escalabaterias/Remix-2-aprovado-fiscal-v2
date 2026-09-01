/**
 * SERVIÇO DE LIMPEZA E MIGRAÇÃO DE BANCO DE DADOS
 *
 * Remove registros antigos e mocks legados (ex: UFGD 2022, Porto Velho 2023)
 * para manter a integridade estrita e o foco em editais fiscais reais.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CleanupResult {
  contestsRemoved: number;
  contestTopicsRemoved: number;
  plansRemoved: number;
}

/**
 * Identifica e remove concursos de teste/mock legados e suas entidades dependentes.
 */
export async function cleanupLegacyMockContests(userId?: string): Promise<CleanupResult> {
  try {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: auth } = await supabase.auth.getUser();
      effectiveUserId = auth.user?.id;
    }

    // 1. Buscar concursos antigos/mocks pelo nome
    const legacyPatterns = ["UFGD", "Porto Velho", "Mock", "Teste Antigo"];

    let query = supabase.from("contests").select("id, name");
    if (effectiveUserId) {
      query = query.eq("user_id", effectiveUserId);
    }

    const { data: allContests, error: fetchErr } = await query;
    if (fetchErr || !allContests || allContests.length === 0) {
      return { contestsRemoved: 0, contestTopicsRemoved: 0, plansRemoved: 0 };
    }

    const legacyContests = allContests.filter((c) =>
      legacyPatterns.some((pattern) => c.name?.toLowerCase().includes(pattern.toLowerCase())),
    );

    if (legacyContests.length === 0) {
      return { contestsRemoved: 0, contestTopicsRemoved: 0, plansRemoved: 0 };
    }

    const legacyIds = legacyContests.map((c) => c.id);
    let contestTopicsRemoved = 0;
    let plansRemoved = 0;

    // 2. Remover em cascata dependências dos concursos legados
    for (const contestId of legacyIds) {
      // Remover tarefas de planos associados
      const { data: plans } = await supabase
        .from("study_plans")
        .select("id")
        .eq("contest_id", contestId);

      if (plans && plans.length > 0) {
        const planIds = plans.map((p) => p.id);
        await supabase.from("plan_tasks").delete().in("plan_id", planIds);
        await supabase.from("plan_blocks").delete().in("plan_id", planIds);
        const { count } = await supabase
          .from("study_plans")
          .delete({ count: "exact" })
          .eq("contest_id", contestId);
        plansRemoved += count ?? plans.length;
      }

      // Remover contest_topics
      const { count: ctCount } = await supabase
        .from("contest_topics")
        .delete({ count: "exact" })
        .eq("contest_id", contestId);
      contestTopicsRemoved += ctCount ?? 0;

      // Remover editais
      await supabase.from("editais").delete().eq("contest_id", contestId);

      // Remover sessões de estudo vinculadas
      await supabase.from("study_sessions").delete().eq("contest_id", contestId);

      // Remover o concurso
      await supabase.from("contests").delete().eq("id", contestId);
    }

    return {
      contestsRemoved: legacyContests.length,
      contestTopicsRemoved,
      plansRemoved,
    };
  } catch (err) {
    console.warn("Erro não-bloqueante na rotina de limpeza de dados legados:", err);
    return { contestsRemoved: 0, contestTopicsRemoved: 0, plansRemoved: 0 };
  }
}
