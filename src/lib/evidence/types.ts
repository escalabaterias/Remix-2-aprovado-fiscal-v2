/**
 * TIPOS DE EVIDÊNCIA COGNITIVA — Etapa 6.16
 *
 * Abstração universal para representar qualquer interação pedagógica
 * do aluno (Teoria, Questões, Flashcards, Revisão, Central de Erros)
 * antes do processamento nos motores cognitivos.
 */

/**
 * Tipos fundamentais de evidência pedagógica:
 * - exposure: Leitura de teoria, vídeo-aula, estudo guiado (Exposição)
 * - practice: Resolução de questões e exercícios objetivos (Prática)
 * - recall: Recuperação ativa via flashcards / cartões de memória (Retenção)
 * - review: Sessão de revisão adaptativa programada (Revisão)
 * - remediation: Resolução ou superação de erro na Central de Erros (Remediação)
 */
export type CognitiveEvidenceKind = "exposure" | "practice" | "recall" | "review" | "remediation";

/**
 * Origem / fonte da atividade de estudo.
 */
export type CognitiveEvidenceSource =
  | "planner_task"
  | "question_bank"
  | "flashcard_deck"
  | "review_session"
  | "error_central"
  | "socratic_tutor"
  | "manual";

/**
 * Nível de confiança declarada pelo aluno (1 a 5).
 * Sinal metacognitivo opcional.
 */
export type DeclaredConfidence = 1 | 2 | 3 | 4 | 5;

/**
 * Dificuldade declarada ou percebida.
 */
export type PerceivedDifficulty = "facil" | "media" | "dificil";

/**
 * Entrada principal para registro de evidência cognitiva.
 */
export type CognitiveEvidenceInput = {
  /** ID do usuário que realizou a atividade */
  userId: string;
  /** ID do tópico do edital associado (Obrigatório) */
  topicId: string;
  /** ID da matéria pai (Opcional, quando disponível) */
  subjectId?: string | null;
  /** ID do concurso / edital (Opcional) */
  contestId?: string | null;
  /** Tipo pedagógico da evidência */
  kind: CognitiveEvidenceKind;
  /** Origem da atividade */
  source: CognitiveEvidenceSource;
  /** Timestamp ISO da ocorrência da evidência (Padrão: agora) */
  timestamp?: string;
  /** Duração da atividade em segundos (quando aplicável) */
  durationSeconds?: number;
  /**
   * Desempenho objetivo associado, de 0.0 a 1.0 (ex: 1.0 = acerto, 0.0 = erro, 0.8 = 80% nos cards).
   * Opcional para modalidades sem score direto (ex: leitura de teoria).
   */
  score?: number | null;
  /** Dificuldade percebida ou atribuída */
  difficulty?: PerceivedDifficulty | null;
  /** Confiança declarada metacognitiva (1 a 5) */
  declaredConfidence?: DeclaredConfidence | null;
  /** ID de referência para a entidade de origem (ex: attemptId, sessionId, errorId) */
  referenceId?: string | null;
  /** Metadados flexíveis adicionais */
  metadata?: Record<string, unknown>;
};

/**
 * Objeto de evidência normalizado pelo Evidence Engine (Puro).
 */
export type NormalizedCognitiveEvidence = {
  userId: string;
  topicId: string;
  subjectId: string | null;
  contestId: string | null;
  kind: CognitiveEvidenceKind;
  source: CognitiveEvidenceSource;
  timestamp: string;
  durationSeconds: number;
  score: number | null;
  difficulty: PerceivedDifficulty;
  declaredConfidence: DeclaredConfidence | null;
  referenceId: string | null;
  /**
   * Peso da evidência no sistema cognitivo (0.0 a 1.0).
   * Calculado deterministicamente pelo Evidence Engine.
   */
  cognitiveWeight: number;
  /**
   * Flag que indica se esta evidência representa apenas EXPOSIÇÃO ao conteúdo
   * e não prova de domínio objetivo.
   */
  isExposureOnly: boolean;
};

/**
 * Resultado da validação e normalização pelo Engine.
 */
export type EvidenceNormalizationResult =
  { success: true; evidence: NormalizedCognitiveEvidence } | { success: false; errors: string[] };

/**
 * Resultado retornado pelo Evidence Service após registro.
 */
export type RecordEvidenceResult = {
  processed: boolean;
  evidence: NormalizedCognitiveEvidence | null;
  skipReason: string | null;
};
