/**
 * PAINEL DE OBSERVABILIDADE E TELEMETRIA DO CICLO COGNITIVO — FASE 7.8
 *
 * Exibe dados em tempo real sobre observabilidade, idempotência, taxa de cache,
 * distribuição dos 5 modos de execução e rastro de auditoria pedagógica.
 *
 * INVARIANTE: Este painel é estritamente observacional. Ele não altera nem interfere
 * nas decisões pedagógicas tomada pelos motores determinísticos.
 */

import React, { useState } from "react";
import {
  Activity,
  Zap,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Brain,
  Clock,
  Layers,
  Search,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  getCognitiveTelemetrySummary,
  getCognitiveAuditTrail,
} from "@/lib/cognitive-cycle/telemetry";

export function CognitiveTelemetryDashboardPanel({ userId }: { userId?: string }) {
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const summary = getCognitiveTelemetrySummary(userId ? { userId } : undefined);
  const auditTrail = getCognitiveAuditTrail(userId ? { userId, limit: 10 } : { limit: 10 });

  const cacheRatePercent = (summary.cacheHitRate * 100).toFixed(1);
  const fallbackRatePercent = (summary.fallbackRate * 100).toFixed(1);

  return (
    <section className="panel p-5 space-y-5" data-testid="cognitive-telemetry-panel">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-foreground">
                Observabilidade do Ciclo Cognitivo
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              >
                Fase 7.8 Ativa
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Monitoramento em tempo real de orquestração, taxa de cache, idempotência e auditoria.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1.5"
          onClick={() => setShowAuditTrail(!showAuditTrail)}
        >
          <Search className="h-3.5 w-3.5" />
          {showAuditTrail ? "Ocultar Auditoria" : "Ver Trilha de Auditoria"}
        </Button>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Orquestrações Totais */}
        <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Orquestrações</span>
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {summary.orchestrationsCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {summary.interactionsCount} interações ativas
          </p>
        </div>

        {/* Taxa de Cache & Idempotência */}
        <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Taxa de Idempotência</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{cacheRatePercent}%</p>
          <p className="text-[11px] text-muted-foreground">
            {summary.cacheHitCount} hits no cache de estado
          </p>
        </div>

        {/* Fallbacks Determinísticos */}
        <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Fallbacks Seguros</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{fallbackRatePercent}%</p>
          <p className="text-[11px] text-muted-foreground">
            {summary.fallbackCount} fallbacks acionados
          </p>
        </div>

        {/* Grounding RAG & Evidências */}
        <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Evidências Reais</span>
            <CheckCircle2 className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {summary.evidenceRecordedCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {summary.legalRagAppliedCount} consultas RAG fundamentadas
          </p>
        </div>
      </div>

      {/* Distribuição dos 5 Modos de Execução */}
      <div className="space-y-3 pt-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Distribuição dos Modos de Execução Pedagógica
        </p>

        <div className="grid gap-2 sm:grid-cols-5">
          {[
            {
              key: "artifact",
              label: "Artefato",
              count: summary.modeDistribution.artifact,
              color: "bg-purple-500",
            },
            {
              key: "socratic",
              label: "Socrático",
              count: summary.modeDistribution.socratic,
              color: "bg-blue-500",
            },
            {
              key: "standard_practice",
              label: "Prática",
              count: summary.modeDistribution.standard_practice,
              color: "bg-emerald-500",
            },
            {
              key: "review",
              label: "Revisão",
              count: summary.modeDistribution.review,
              color: "bg-amber-500",
            },
            {
              key: "direct_study",
              label: "Estudo Direto",
              count: summary.modeDistribution.direct_study,
              color: "bg-cyan-500",
            },
          ].map((mode) => {
            const percent =
              summary.totalEvents > 0 ? Math.round((mode.count / summary.totalEvents) * 100) : 0;
            return (
              <div
                key={mode.key}
                className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{mode.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{mode.count}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${mode.color}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trilha de Auditoria (Expandível) */}
      {showAuditTrail && (
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Trilha de Auditoria Pedagógica (Audit Trail)
          </p>

          {auditTrail.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              Nenhum evento registrado na sessão atual.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-muted-foreground">
                <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider font-semibold text-foreground">
                  <tr>
                    <th className="py-2 px-2">Horário</th>
                    <th className="py-2 px-2">Evento</th>
                    <th className="py-2 px-2">Ação Pedagógica</th>
                    <th className="py-2 px-2">Modo</th>
                    <th className="py-2 px-2">Grounding RAG</th>
                    <th className="py-2 px-2">Idempotência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {auditTrail.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/20">
                      <td className="py-2 px-2 font-mono text-[11px]">
                        {new Date(rec.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-2 font-medium text-foreground">{rec.eventType}</td>
                      <td className="py-2 px-2">{rec.pedagogicalAction}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-[10px]">
                          {rec.executionMode}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        {rec.legalGroundingAttached ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <Scale className="h-3 w-3" /> Sim
                          </span>
                        ) : (
                          "Não"
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {rec.isIdempotentHit ? (
                          <span className="text-amber-600 font-medium">Cache Hit</span>
                        ) : (
                          "Execução"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
