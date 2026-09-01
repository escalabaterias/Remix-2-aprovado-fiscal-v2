/**
 * SERVER FUNCTION — AI Gateway Execution & Cache Persistence
 *
 * Executa chamadas ao modelo Gemini exclusivamente no ambiente server-side,
 * consultando e persistindo cache na tabela `ai_results` do Supabase.
 *
 * SEGURANÇA:
 *  - Executa sob o middleware requireSupabaseAuth (autenticado)
 *  - GEMINI_API_KEY é lida estritamente no servidor (process.env)
 *  - Isolamento por user_id via RLS no Supabase
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiTier = "rapida" | "inteligente" | "profunda";

export type ServerAiTaskInput = {
  taskType: string;
  tier: AiTier;
  inputHash: string;
  inputRef: Record<string, unknown>;
  promptVersion: string;
  systemPrompt?: string;
  userPrompt?: string;
  forceRefresh?: boolean;
};

export type ServerAiTaskResult<T = unknown> = {
  output: T | null;
  cached: boolean;
  status: "processado" | "erro" | "pendente";
  errorMessage?: string;
  model?: string;
  durationMs: number;
};

const TIER_MODELS: Record<AiTier, string> = {
  rapida: "gemini-3.6-flash",
  inteligente: "gemini-3.6-flash",
  profunda: "gemini-3.6-flash",
};

const TIER_TIMEOUTS: Record<AiTier, number> = {
  rapida: 15_000,
  inteligente: 30_000,
  profunda: 45_000,
};

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Server Function principal do AI Gateway.
 */
export const serverExecuteAiTask = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator((input: ServerAiTaskInput): ServerAiTaskInput => {
    if (!input.taskType || input.taskType.trim().length === 0) {
      throw new Error("taskType é obrigatório.");
    }
    if (!input.inputHash || input.inputHash.trim().length === 0) {
      throw new Error("inputHash é obrigatório.");
    }
    if (!["rapida", "inteligente", "profunda"].includes(input.tier)) {
      throw new Error(`Tier inválido: ${input.tier}`);
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<ServerAiTaskResult> => {
    const startTime = Date.now();
    const supabase = context.supabase;
    const userId = context.userId;

    // 1. Tentar consultar do cache `ai_results`
    if (!data.forceRefresh) {
      try {
        const { data: cachedRow, error: cacheErr } = await supabase
          .from("ai_results")
          .select("*")
          .eq("user_id", userId)
          .eq("task_type", data.taskType)
          .eq("input_hash", data.inputHash)
          .maybeSingle();

        if (
          !cacheErr &&
          cachedRow &&
          cachedRow.status === "processado" &&
          cachedRow.output !== null
        ) {
          return {
            output: cachedRow.output,
            cached: true,
            status: "processado",
            model: cachedRow.model ?? undefined,
            durationMs: Date.now() - startTime,
          };
        }
      } catch {
        // Falha no cache não interrompe a execução do modelo
      }
    }

    // 2. Verificar API key no servidor
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        output: null,
        cached: false,
        status: "erro",
        errorMessage: "Chave de API Gemini não configurada no servidor (GEMINI_API_KEY).",
        durationMs: Date.now() - startTime,
      };
    }

    // 3. Montar chamada ao Gemini
    const model = TIER_MODELS[data.tier] || "gemini-3.6-flash";
    const timeoutMs = TIER_TIMEOUTS[data.tier] || 30_000;
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey.trim()}`;

    const systemText = data.systemPrompt ? `${data.systemPrompt}\n\n` : "";
    const userText = data.userPrompt || JSON.stringify(data.inputRef);
    const fullPrompt = `${systemText}Inspeção de tarefa: ${data.taskType}\nEntrada: ${userText}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: fullPrompt }],
        },
      ],
      generationConfig: {
        temperature: data.tier === "rapida" ? 0.1 : 0.3,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const isAbort =
        err instanceof DOMException || (err instanceof Error && err.name === "AbortError");
      const errorMsg = isAbort
        ? `Timeout de ${timeoutMs}ms excedido na chamada ao Gemini.`
        : err instanceof Error
          ? err.message
          : "Erro desconhecido na rede.";

      // Tentar registrar falha no ai_results para observabilidade
      try {
        await supabase.from("ai_results").upsert(
          {
            user_id: userId,
            task_type: data.taskType,
            tier: data.tier,
            input_hash: data.inputHash,
            input_ref: data.inputRef as any,
            status: "erro",
            error_message: errorMsg,
            model,
          },
          { onConflict: "user_id,task_type,input_hash" },
        );
      } catch {
        // Ignora falha de log
      }

      return {
        output: null,
        cached: false,
        status: "erro",
        errorMessage: errorMsg,
        model,
        durationMs,
      };
    }

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      let errorMsg = `Gemini API retornou HTTP ${response.status}.`;
      try {
        const errorJson = (await response.json()) as { error?: { message?: string } };
        if (errorJson?.error?.message) {
          errorMsg = `Gemini: ${errorJson.error.message}`;
        }
      } catch {
        // Ignora parse de erro
      }

      try {
        await supabase.from("ai_results").upsert(
          {
            user_id: userId,
            task_type: data.taskType,
            tier: data.tier,
            input_hash: data.inputHash,
            input_ref: data.inputRef as any,
            status: "erro",
            error_message: errorMsg,
            model,
          },
          { onConflict: "user_id,task_type,input_hash" },
        );
      } catch {
        // Ignora falha de log
      }

      return {
        output: null,
        cached: false,
        status: "erro",
        errorMessage: errorMsg,
        model,
        durationMs,
      };
    }

    // Parse do resultado
    let parsedOutput: unknown = null;
    try {
      const respJson = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const rawText = respJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (rawText) {
        try {
          parsedOutput = JSON.parse(rawText);
        } catch {
          // Tentar bloco json markdown
          const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (match?.[1]) {
            parsedOutput = JSON.parse(match[1].trim());
          } else {
            parsedOutput = { text: rawText };
          }
        }
      }
    } catch {
      return {
        output: null,
        cached: false,
        status: "erro",
        errorMessage: "Falha ao ler ou parsear resposta JSON do Gemini.",
        model,
        durationMs,
      };
    }

    // Persistir em `ai_results`
    try {
      await supabase.from("ai_results").upsert(
        {
          user_id: userId,
          task_type: data.taskType,
          tier: data.tier,
          input_hash: data.inputHash,
          input_ref: data.inputRef as any,
          output: parsedOutput as never,
          model,
          status: "processado",
          error_message: null,
        },
        { onConflict: "user_id,task_type,input_hash" },
      );
    } catch {
      // Erro na escrita do cache não impede o retorno do resultado ao cliente
    }

    return {
      output: parsedOutput,
      cached: false,
      status: "processado",
      model,
      durationMs,
    };
  });
