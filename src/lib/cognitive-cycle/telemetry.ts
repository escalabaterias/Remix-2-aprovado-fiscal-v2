/**
 * TELEMETRIA E AUDITORIA DO CICLO COGNITIVO — FASE 7.8
 *
 * Módulo de telemetria, observabilidade e auditoria determinística do Orquestrador Unificado do Ciclo Cognitivo:
 * 1. Registra eventos de telemetria e rastros de auditoria (audit trail) sem alterar a execução pedagógica.
 * 2. Mede métricas de desempenho: latência, taxa de acerto de cache, distribuição de modos e eficácia.
 * 3. Enforce estrito de idempotência e ausência de evidência passiva.
 * 4. Garante total conformidade com a soberania do Decision Engine (7.5) e Artifacts Engine (7.6).
 */

import type {
  CognitiveExecutionMode,
  CognitiveCycleStepPlan,
  CognitiveCycleInteractionResult,
} from "./types";
import type { PedagogicalAction } from "../decision/types";

/** Tipos de eventos de telemetria cognitiva (Fase 7.8) */
export type CognitiveTelemetryEventType =
  | "PLAN_ORCHESTRATED"
  | "INTERACTION_PROCESSED"
  | "IDEMPOTENCY_HIT"
  | "FALLBACK_TRIGGERED"
  | "LEGAL_RAG_APPLIED"
  | "EVIDENCE_RECORDED";

/** Registro individual de evento de telemetria cognitiva */
export interface CognitiveTelemetryEvent {
  id: string;
  eventType: CognitiveTelemetryEventType;
  userId: string;
  topicId: string;
  subjectId?: string | null;
  executionMode?: CognitiveExecutionMode;
  pedagogicalAction?: PedagogicalAction | string;
  artifactKind?: string | null;
  idempotencyKey?: string;
  isCacheHit?: boolean;
  fallbackTriggered?: boolean;
  fallbackReason?: string;
  legalGroundingApplied?: boolean;
  evidenceRecorded?: boolean;
  score?: number | null;
  durationMs?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

/** Resumo analítico de telemetria e observabilidade */
export interface CognitiveTelemetrySummary {
  totalEvents: number;
  orchestrationsCount: number;
  interactionsCount: number;
  cacheHitCount: number;
  cacheHitRate: number;
  fallbackCount: number;
  fallbackRate: number;
  legalRagAppliedCount: number;
  evidenceRecordedCount: number;
  modeDistribution: Record<CognitiveExecutionMode, number>;
  actionDistribution: Record<string, number>;
  averageScore: number;
  averageLatencyMs: number;
  generatedAt: string;
}

/** Registro resumido para audit trail de conformidade */
export interface CognitiveAuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  topicId: string;
  eventType: CognitiveTelemetryEventType;
  pedagogicalAction: string;
  executionMode: string;
  isIdempotentHit: boolean;
  legalGroundingAttached: boolean;
  fallbackOccurred: boolean;
  details: string;
}

/** Store em memória para eventos de telemetria cognitiva (Fase 7.8) */
const telemetryStore: CognitiveTelemetryEvent[] = [];
const MAX_TELEMETRY_EVENTS = 2000;

/**
 * Registra um evento de telemetria cognitiva de forma pura, não-bloqueante e determinística.
 */
export function recordCognitiveTelemetry(
  eventInput: Omit<CognitiveTelemetryEvent, "id" | "timestamp">,
): CognitiveTelemetryEvent {
  const event: CognitiveTelemetryEvent = {
    ...eventInput,
    id: `telemetry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  telemetryStore.push(event);

  // Manter limite máximo do buffer em memória
  if (telemetryStore.length > MAX_TELEMETRY_EVENTS) {
    telemetryStore.shift();
  }

  return event;
}

/**
 * Retorna o histórico bruto de eventos de telemetria com filtros opcionais.
 */
export function getCognitiveTelemetryEvents(filter?: {
  userId?: string;
  topicId?: string;
  eventType?: CognitiveTelemetryEventType;
  limit?: number;
}): CognitiveTelemetryEvent[] {
  let events = [...telemetryStore];

  if (filter?.userId) {
    events = events.filter((e) => e.userId === filter.userId);
  }
  if (filter?.topicId) {
    events = events.filter((e) => e.topicId === filter.topicId);
  }
  if (filter?.eventType) {
    events = events.filter((e) => e.eventType === filter.eventType);
  }

  if (filter?.limit && filter.limit > 0) {
    events = events.slice(-filter.limit);
  }

  return events;
}

/**
 * Calcula o resumo consolidador de telemetria e observabilidade do ciclo cognitivo (Fase 7.8).
 */
export function getCognitiveTelemetrySummary(filter?: {
  userId?: string;
  topicId?: string;
}): CognitiveTelemetrySummary {
  const events = getCognitiveTelemetryEvents(filter);

  const totalEvents = events.length;
  let orchestrationsCount = 0;
  let interactionsCount = 0;
  let cacheHitCount = 0;
  let fallbackCount = 0;
  let legalRagAppliedCount = 0;
  let evidenceRecordedCount = 0;
  let totalScore = 0;
  let scoreCount = 0;
  let totalLatency = 0;
  let latencyCount = 0;

  const modeDistribution: Record<CognitiveExecutionMode, number> = {
    artifact: 0,
    socratic: 0,
    standard_practice: 0,
    review: 0,
    direct_study: 0,
  };

  const actionDistribution: Record<string, number> = {};

  for (const ev of events) {
    if (ev.eventType === "PLAN_ORCHESTRATED") orchestrationsCount++;
    if (ev.eventType === "INTERACTION_PROCESSED") interactionsCount++;
    if (ev.isCacheHit || ev.eventType === "IDEMPOTENCY_HIT") cacheHitCount++;
    if (ev.fallbackTriggered || ev.eventType === "FALLBACK_TRIGGERED") fallbackCount++;
    if (ev.legalGroundingApplied || ev.eventType === "LEGAL_RAG_APPLIED") legalRagAppliedCount++;
    if (ev.evidenceRecorded || ev.eventType === "EVIDENCE_RECORDED") evidenceRecordedCount++;

    if (ev.executionMode && modeDistribution[ev.executionMode] !== undefined) {
      modeDistribution[ev.executionMode]++;
    }

    if (ev.pedagogicalAction) {
      const act = String(ev.pedagogicalAction);
      actionDistribution[act] = (actionDistribution[act] || 0) + 1;
    }

    if (typeof ev.score === "number") {
      totalScore += ev.score;
      scoreCount++;
    }

    if (typeof ev.durationMs === "number") {
      totalLatency += ev.durationMs;
      latencyCount++;
    }
  }

  return {
    totalEvents,
    orchestrationsCount,
    interactionsCount,
    cacheHitCount,
    cacheHitRate: totalEvents > 0 ? cacheHitCount / totalEvents : 0,
    fallbackCount,
    fallbackRate: orchestrationsCount > 0 ? fallbackCount / orchestrationsCount : 0,
    legalRagAppliedCount,
    evidenceRecordedCount,
    modeDistribution,
    actionDistribution,
    averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
    averageLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Gera a trilha auditável de eventos do Ciclo Cognitivo para auditoria pedagógica (Fase 7.8).
 */
export function getCognitiveAuditTrail(filter?: {
  userId?: string;
  topicId?: string;
  limit?: number;
}): CognitiveAuditRecord[] {
  const events = getCognitiveTelemetryEvents(filter);

  return events.map((ev) => ({
    id: ev.id,
    timestamp: ev.timestamp,
    userId: ev.userId,
    topicId: ev.topicId,
    eventType: ev.eventType,
    pedagogicalAction: String(ev.pedagogicalAction || "N/A"),
    executionMode: String(ev.executionMode || "N/A"),
    isIdempotentHit: Boolean(ev.isCacheHit || ev.eventType === "IDEMPOTENCY_HIT"),
    legalGroundingAttached: Boolean(ev.legalGroundingApplied),
    fallbackOccurred: Boolean(ev.fallbackTriggered),
    details: buildAuditDetails(ev),
  }));
}

/**
 * Limpa todos os eventos de telemetria (utilizado primariamente em testes).
 */
export function clearCognitiveTelemetry(): void {
  telemetryStore.length = 0;
}

/**
 * Exporta métricas consolidadas para integração com monitores executivos.
 */
export function exportTelemetryMetrics() {
  const summary = getCognitiveTelemetrySummary();
  return {
    totalEvents: summary.totalEvents,
    cacheHitRate: Number(summary.cacheHitRate.toFixed(4)),
    fallbackRate: Number(summary.fallbackRate.toFixed(4)),
    modeDistribution: summary.modeDistribution,
    actionDistribution: summary.actionDistribution,
    averageLatencyMs: summary.averageLatencyMs,
    averageScore: Number(summary.averageScore.toFixed(2)),
  };
}

function buildAuditDetails(ev: CognitiveTelemetryEvent): string {
  const parts: string[] = [];
  if (ev.idempotencyKey) parts.push(`Key: ${ev.idempotencyKey}`);
  if (ev.fallbackReason) parts.push(`Fallback: ${ev.fallbackReason}`);
  if (typeof ev.score === "number") parts.push(`Score: ${ev.score}`);
  if (typeof ev.durationMs === "number") parts.push(`Latency: ${ev.durationMs}ms`);
  return parts.length > 0 ? parts.join(" | ") : "Execução nominal";
}
