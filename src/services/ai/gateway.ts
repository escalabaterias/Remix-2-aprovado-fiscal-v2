/**
 * Camada de serviço de IA — DESACOPLADA, SEGURA E PERSISTIDA VIA AI_RESULTS.
 *
 * Princípio: PROCESSAR UMA VEZ → ARMAZENAR EM CACHE → REUTILIZAR.
 *
 * Três níveis suportados:
 *  - `rapida`     operações simples e frequentes (orientações rápidas, resumos curtos);
 *  - `inteligente` diagnóstico contextual, plano de estudos e perfil do aluno;
 *  - `profunda`   análise pedagógica avançada e múltiplos sinais cognitivos.
 *
 * SEGURANÇA:
 *  - Nenhuma API Key do Gemini é exposta no bundle client-side.
 *  - As chamadas são delegadas para Server Functions (`serverExecuteAiTask`)
 *    que validam a autenticação via JWT/Supabase e mantêm isolamento RLS.
 *  - Em caso de indisponibilidade da IA, retorna status de erro gracioso
 *    sem quebrar os motores determinísticos.
 */

import { serverExecuteAiTask, type AiTier } from "./gateway-server-fn";

export type { AiTier };

export const DEFAULT_PROMPT_VERSION = "7.1.0";

export type AiTask = {
  /** Identificador estável da tarefa, ex.: "coach.orientacao", "erro.diagnostico". */
  type: string;
  /** Nível de inteligência e tempo limite estipulado. */
  tier: AiTier;
  /** Referência ou insumo estruturado da tarefa. */
  inputRef: Record<string, unknown>;
  /** Versão do prompt utilizada para invalidação determinística de cache. */
  promptVersion?: string;
  /** Prompt do sistema opcional. */
  systemPrompt?: string;
  /** Prompt do usuário opcional. */
  userPrompt?: string;
  /** Força o reprocessamento ignorando cache prévio. */
  forceRefresh?: boolean;
};

export type AiResult<T = unknown> = {
  output: T | null;
  cached: boolean;
  status: "processado" | "erro" | "pendente" | "ignorado";
  errorMessage?: string;
  model?: string;
  durationMs?: number;
};

/**
 * Converte qualquer objeto/JSON em uma representação string canônica e determinística.
 * Ordena as chaves recursivamente em todos os níveis do objeto.
 */
export function toCanonicalJson(val: unknown): string {
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return "[" + val.map(toCanonicalJson).join(",") + "]";
  }
  const keys = Object.keys(val as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => JSON.stringify(k) + ":" + toCanonicalJson((val as Record<string, unknown>)[k]),
  );
  return "{" + entries.join(",") + "}";
}

/**
 * Hash determinístico e estável do insumo, usado como chave de cache em `ai_results`.
 * Considera tipo da tarefa, tier, versão do prompt, inputRef e prompts.
 */
export async function hashInput(input: unknown): Promise<string> {
  const canonical = toCanonicalJson(input);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Ponto de entrada único para qualquer tarefa de IA do produto.
 *
 * 1. Calcula hash determinístico com a versão do prompt.
 * 2. Consulta a tabela `ai_results` via Server Function.
 * 3. Se houver hit de cache válido, retorna imediatamente.
 * 4. Caso contrário, executa a chamada privada ao Gemini e persiste o resultado.
 * 5. Tratamento de falha gracioso que garante não quebrar fluxos determinísticos.
 */
export async function runAiTask<T = unknown>(task: AiTask): Promise<AiResult<T>> {
  const promptVersion = task.promptVersion || DEFAULT_PROMPT_VERSION;

  // Objeto estruturado para cálculo de hash determinístico
  const hashPayload = {
    type: task.type,
    tier: task.tier,
    promptVersion,
    inputRef: task.inputRef,
    systemPrompt: task.systemPrompt ?? "",
    userPrompt: task.userPrompt ?? "",
  };

  const inputHash = await hashInput(hashPayload);

  try {
    const res = await serverExecuteAiTask({
      data: {
        taskType: task.type,
        tier: task.tier,
        inputHash,
        inputRef: task.inputRef,
        promptVersion,
        systemPrompt: task.systemPrompt,
        userPrompt: task.userPrompt,
        forceRefresh: task.forceRefresh,
      },
    });

    return {
      output: (res.output as T) ?? null,
      cached: res.cached,
      status: res.status,
      errorMessage: res.errorMessage,
      model: res.model,
      durationMs: res.durationMs,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Falha na comunicação com o AI Gateway.";
    return {
      output: null,
      cached: false,
      status: "erro",
      errorMessage: msg,
    };
  }
}
