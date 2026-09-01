import {
  DistributionConfig,
  ExamGenerationOptions,
  ExamGenerationWarning,
  GeneratedExamStructure,
  QuestionCandidate,
} from "./types";

export interface SelectQuestionsParams {
  candidates: QuestionCandidate[];
  distribution: DistributionConfig;
  options?: ExamGenerationOptions;
  userAnsweredQuestionIds?: Set<string>;
  userTopicMastery?: Record<string, number>; // topic_id -> mastery_score (0 a 1)
}

export class ExamGeneratorEngine {
  /**
   * Executa a seleção matemática e determinística de questões para montar o simulado
   */
  static selectQuestions(params: SelectQuestionsParams): GeneratedExamStructure {
    const {
      candidates,
      distribution,
      options = {},
      userAnsweredQuestionIds = new Set<string>(),
      userTopicMastery = {},
    } = params;

    const selectedQuestions: Array<{
      question: QuestionCandidate;
      position: number;
      weight: number;
    }> = [];

    const warnings: ExamGenerationWarning[] = [];

    // Determina os filtros de banca aplicáveis (options sobrescreve distribution)
    const activeBancas =
      options.override_bancas !== undefined ? options.override_bancas : distribution.bancas || [];

    // Determina se há override de dificuldade ativo
    const activeDifficultyOverride = options.override_difficulty;

    let positionCounter = 1;
    let maxPossibleScore = 0;

    // Processa cada disciplina cadastrada na distribuição
    for (const subject of distribution.subjects) {
      const subjectWeight = subject.weight ?? 1.0;
      const targetCount = subject.count;

      if (targetCount <= 0) continue;

      // 1. Filtrar candidatos pertencentes a esta disciplina
      let subjectCandidates = candidates.filter((c) => c.subject_id === subject.subject_id);

      // 2. Filtrar por tópicos se especificados
      if (subject.topic_ids && subject.topic_ids.length > 0) {
        const topicSet = new Set(subject.topic_ids);
        subjectCandidates = subjectCandidates.filter((c) => topicSet.has(c.topic_id));
      }

      // 3. Filtrar pelas bancas ativas (caso haja filtro de banca)
      if (activeBancas.length > 0) {
        const bancaSet = new Set(activeBancas.map((b) => b.toLowerCase()));
        const filteredByBanca = subjectCandidates.filter((c) =>
          bancaSet.has(c.banca.toLowerCase()),
        );

        // Se o filtro de banca esvaziar o pool da matéria, relaxamos e avisamos
        if (filteredByBanca.length === 0 && subjectCandidates.length > 0) {
          warnings.push({
            code: "banca_filter_relaxed",
            message: `Filtro de banca relaxado para a matéria devido a estoque zero de candidatos.`,
            subject_id: subject.subject_id,
            requested_count: targetCount,
            available_count: subjectCandidates.length,
          });
        } else {
          subjectCandidates = filteredByBanca;
        }
      }

      // 4. Filtrar por reuso (allow_already_answered = false)
      const allowAlreadyAnswered = distribution.allow_already_answered !== false;
      const unusedCandidates = subjectCandidates.filter((c) => !userAnsweredQuestionIds.has(c.id));

      let finalCandidatesPool = [...subjectCandidates];

      if (!allowAlreadyAnswered) {
        if (unusedCandidates.length >= targetCount) {
          finalCandidatesPool = unusedCandidates;
        } else {
          // Estoque de inéditas insuficiente
          warnings.push({
            code: "insufficient_questions",
            message: `Estoque de questões inéditas insuficiente. Utilizando questões já resolvidas como fallback.`,
            subject_id: subject.subject_id,
            requested_count: targetCount,
            available_count: unusedCandidates.length,
          });
          // Se force_max_questions for true ou fallback habilitado implicitamente por segurança de prova:
          // misturamos as não respondidas primeiro e completamos com as já respondidas.
          const answeredCandidates = subjectCandidates.filter((c) =>
            userAnsweredQuestionIds.has(c.id),
          );

          // Ordena as respondidas de forma a priorizar menor reuso se possível, ou mantém original
          finalCandidatesPool = [...unusedCandidates, ...answeredCandidates];
        }
      }

      // Se não há candidatos após filtros
      if (finalCandidatesPool.length === 0) {
        warnings.push({
          code: "missing_subject_questions",
          message: `Nenhuma questão encontrada para a matéria especificada.`,
          subject_id: subject.subject_id,
          requested_count: targetCount,
          available_count: 0,
        });
        continue;
      }

      // 5. Distribuição de dificuldade
      let subjectSelected: QuestionCandidate[] = [];

      if (activeDifficultyOverride) {
        // Filtro rígido de dificuldade via override
        const diffCandidates = finalCandidatesPool.filter(
          (c) => c.difficulty === activeDifficultyOverride,
        );
        if (diffCandidates.length === 0) {
          warnings.push({
            code: "difficulty_filter_relaxed",
            message: `Dificuldade solicitada (${activeDifficultyOverride}) indisponível. Relaxando filtro para geral.`,
            subject_id: subject.subject_id,
            requested_count: targetCount,
            available_count: finalCandidatesPool.length,
          });
        } else {
          finalCandidatesPool = diffCandidates;
        }
      }

      // Ordenação pedagógica por domínio de tópicos (Priorizar tópicos com MENOR maestria do usuário)
      // Agrupa e pondera cada candidato do pool
      finalCandidatesPool.sort((a, b) => {
        const masteryA = userTopicMastery[a.topic_id] ?? 1.0;
        const masteryB = userTopicMastery[b.topic_id] ?? 1.0;

        // Prioridade para maestria menor (estudo focado em lacunas)
        if (masteryA !== masteryB) {
          return masteryA - masteryB;
        }

        // Critério secundário: inéditas primeiro
        const answeredA = userAnsweredQuestionIds.has(a.id) ? 1 : 0;
        const answeredB = userAnsweredQuestionIds.has(b.id) ? 1 : 0;
        return answeredA - answeredB;
      });

      // Aplicação da distribuição proporcional de dificuldades se cadastrada no template
      const diffDist = distribution.difficulty_distribution;
      if (
        diffDist &&
        !activeDifficultyOverride &&
        (diffDist.easy !== undefined ||
          diffDist.medium !== undefined ||
          diffDist.hard !== undefined)
      ) {
        const easyPct = diffDist.easy ?? 0;
        const mediumPct = diffDist.medium ?? 0;
        const hardPct = diffDist.hard ?? 0;
        const totalPct = easyPct + mediumPct + hardPct || 100;

        // Calcula metas ideais para cada faixa de dificuldade baseada no targetCount total da matéria
        const targetEasy = Math.round(targetCount * (easyPct / totalPct));
        const targetMedium = Math.round(targetCount * (mediumPct / totalPct));
        const targetHard = targetCount - targetEasy - targetMedium; // O resto vai para difícil para totalizar de forma exata

        const poolEasy = finalCandidatesPool.filter((c) => c.difficulty === "easy");
        const poolMedium = finalCandidatesPool.filter((c) => c.difficulty === "medium");
        const poolHard = finalCandidatesPool.filter((c) => c.difficulty === "hard");

        // Seleciona de forma resiliente de cada pool
        const selectedEasy = poolEasy.slice(0, targetEasy);
        const selectedMedium = poolMedium.slice(0, targetMedium);
        const selectedHard = poolHard.slice(0, targetHard);

        let currentSelected = [...selectedEasy, ...selectedMedium, ...selectedHard];

        // Se faltou questões devido à segmentação rígida por nível de dificuldade, completamos com candidatos restantes
        if (currentSelected.length < targetCount) {
          const alreadySelectedIds = new Set(currentSelected.map((c) => c.id));
          const remainingCandidates = finalCandidatesPool.filter(
            (c) => !alreadySelectedIds.has(c.id),
          );

          const compensationCount = targetCount - currentSelected.length;
          currentSelected = [
            ...currentSelected,
            ...remainingCandidates.slice(0, compensationCount),
          ];
        }

        subjectSelected = currentSelected;
      } else {
        // Se não há distribuição proporcional de dificuldade, seleciona sequencialmente as melhores
        subjectSelected = finalCandidatesPool.slice(0, targetCount);
      }

      // Se o total selecionado ficou menor que o desejado
      if (subjectSelected.length < targetCount) {
        warnings.push({
          code: "insufficient_questions",
          message: `Estoque total insuficiente para completar as ${targetCount} questões desejadas para a matéria. Disponíveis: ${subjectSelected.length}.`,
          subject_id: subject.subject_id,
          requested_count: targetCount,
          available_count: subjectSelected.length,
        });
      }

      // 6. Embaralhamento opcional se configurado
      if (options.shuffle_questions !== false) {
        // Fisher-Yates Shuffle determinístico/aleatório simples por disciplina
        for (let i = subjectSelected.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [subjectSelected[i], subjectSelected[j]] = [subjectSelected[j], subjectSelected[i]];
        }
      }

      // Adiciona as questões selecionadas ao simulado final
      for (const question of subjectSelected) {
        selectedQuestions.push({
          question,
          position: positionCounter++,
          weight: subjectWeight,
        });
        maxPossibleScore += subjectWeight;
      }
    }

    // Se as opções pedem ordenação inter-disciplinar global ou mista, poderíamos fazer aqui.
    // Por padrão, as questões ficam agrupadas por disciplina ou embaralhadas individualmente se o shuffle estiver ativo globalmente.
    if (options.shuffle_questions !== false) {
      // Caso queira embaralhar as posições finais de forma totalmente mista:
      for (let i = selectedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
      }
      // Re-atribui as posições sequenciais após o shuffle global
      selectedQuestions.forEach((sq, idx) => {
        sq.position = idx + 1;
      });
    }

    // Monta o payload estruturado de retorno do simulado
    const timeLimitMinutes = distribution.subjects.reduce((acc, sub) => acc + sub.count * 1.5, 0); // Estimativa de fallback de tempo limite (1.5 min/questão)
    const timeLimitSeconds = Math.max(60, Math.round(timeLimitMinutes * 60));

    return {
      session_payload: {
        set_id: crypto.randomUUID ? crypto.randomUUID() : this.generateUUID(),
        time_limit_seconds: timeLimitSeconds,
        max_possible_score: parseFloat(maxPossibleScore.toFixed(2)),
      },
      selected_questions: selectedQuestions,
      warnings,
    };
  }

  /**
   * Fallback de UUID simples para ambientes de teste caso crypto.randomUUID não esteja disponível
   */
  private static generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
