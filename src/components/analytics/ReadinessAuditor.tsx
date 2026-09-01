import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  HelpCircle,
  Layers,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

import {
  calculateReadinessScore,
  generateLastMinuteActionPlan,
  simulateCutoff,
  TARGET_EXAMS_BENCHMARKS,
} from "@/lib/analytics/readinessEngine";
import type { CutoffSimulation } from "@/lib/analytics/readinessTypes";

export const ReadinessAuditor: React.FC = () => {
  const readiness = calculateReadinessScore();
  const [selectedExamId, setSelectedExamId] = useState<string>(TARGET_EXAMS_BENCHMARKS[0].id);
  const selectedBenchmark =
    TARGET_EXAMS_BENCHMARKS.find((e) => e.id === selectedExamId) || TARGET_EXAMS_BENCHMARKS[0];

  const [objScore, setObjScore] = useState<number>(
    Math.round(selectedBenchmark.totalObjectivePoints * 0.8),
  );
  const [discScore, setDiscScore] = useState<number>(
    Math.round(selectedBenchmark.totalDiscursivePoints * 0.75),
  );

  const simulation: CutoffSimulation = simulateCutoff(selectedExamId, objScore, discScore);
  const actionPlan = generateLastMinuteActionPlan();

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    const bench =
      TARGET_EXAMS_BENCHMARKS.find((e) => e.id === examId) || TARGET_EXAMS_BENCHMARKS[0];
    setObjScore(Math.round(bench.totalObjectivePoints * 0.8));
    setDiscScore(Math.round(bench.totalDiscursivePoints * 0.75));
  };

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "competitive":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "solid":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "moderate":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "competitive":
        return "Nível Competitivo (Aprovável)";
      case "solid":
        return "Nível Solidez Preparatória";
      case "moderate":
        return "Nível Intermediário";
      default:
        return "Alerta: Atenção Crítica em Várias Frentes";
    }
  };

  return (
    <div className="space-y-8" id="readiness-auditor-root">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Módulo 10 • Reta Final
            </span>
            <span className="text-xs text-zinc-400">Auditoria Global de Prontidão</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-400" />
            Índice de Prontidão Fiscal (IPF)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Consolidação de objetivas, discursivas, retenção de memória e cobertura do edital.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-zinc-950/70 p-4 rounded-lg border border-zinc-800">
          <div className="text-right">
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
              Score Global (IPF)
            </div>
            <div className="text-3xl font-black text-emerald-400">{readiness.overallIndex}%</div>
          </div>
          <div className="h-10 w-px bg-zinc-800" />
          <div>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getBadgeColor(
                readiness.diagnosticLevel,
              )}`}
            >
              <Award className="w-3.5 h-3.5" />
              {getLevelLabel(readiness.diagnosticLevel)}
            </span>
          </div>
        </div>
      </div>

      {/* 4 PILARES DA PRONTIDÃO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Objetivas & Simulados
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{readiness.objectiveContribution}%</div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${readiness.objectiveContribution}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">Aproveitamento estimado nas provas objetivas.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Discursivas & Peças
            </span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {readiness.discursiveContribution}%
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${readiness.discursiveContribution}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">Nota média nas rodadas dissertativas.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Retenção em Memória
            </span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{readiness.memoryContribution}%</div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${readiness.memoryContribution}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">Consistência na repetição espaçada.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Cobertura do Edital
            </span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{readiness.syllabusContribution}%</div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${readiness.syllabusContribution}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">Conclusão ponderada das disciplinas fiscais.</p>
        </div>
      </div>

      {/* SIMULADOR DE CENÁRIOS DE CORTE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              Simulador de Notas de Corte & Projeção de Ranking
            </h2>
            <p className="text-xs text-zinc-400">
              Estime sua colocação final combinando o desempenho projetado em ambas as fases.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-400">Concurso Alvo:</label>
            <select
              className="bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={selectedExamId}
              onChange={(e) => handleExamChange(e.target.value)}
            >
              {TARGET_EXAMS_BENCHMARKS.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.banca})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CONTROLES DO SIMULADOR */}
          <div className="lg:col-span-1 space-y-5 bg-zinc-950/60 p-4 rounded-lg border border-zinc-800">
            <div>
              <div className="flex justify-between text-xs text-zinc-300 font-medium mb-1">
                <span>Prova Objetiva (Máx: {selectedBenchmark.totalObjectivePoints} pts)</span>
                <span className="font-bold text-emerald-400">{objScore} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={selectedBenchmark.totalObjectivePoints}
                step={1}
                value={objScore}
                onChange={(e) => setObjScore(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 font-medium mb-1">
                <span>Prova Discursiva (Máx: {selectedBenchmark.totalDiscursivePoints} pts)</span>
                <span className="font-bold text-blue-400">{discScore} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={selectedBenchmark.totalDiscursivePoints}
                step={0.5}
                value={discScore}
                onChange={(e) => setDiscScore(Number(e.target.value))}
                className="w-full accent-blue-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Corte Histórico Esperado:</span>
                <span className="font-semibold text-zinc-200">
                  {selectedBenchmark.historicalCutoffPoints} pts (
                  {selectedBenchmark.historicalCutoffPercentage}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Vagas Imediatas:</span>
                <span className="font-semibold text-zinc-200">
                  {selectedBenchmark.totalVacancies} vagas
                </span>
              </div>
            </div>
          </div>

          {/* RESULTADO DA SIMULAÇÃO */}
          <div className="lg:col-span-2 flex flex-col justify-between bg-zinc-950/90 border border-zinc-800 p-5 rounded-lg space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Projeção de Resultado
                </div>
                <div className="text-2xl font-black text-zinc-100 mt-1">
                  {simulation.totalSimulatedPoints} /{" "}
                  {selectedBenchmark.totalObjectivePoints + selectedBenchmark.totalDiscursivePoints}{" "}
                  pts
                  <span className="text-sm font-normal text-zinc-400 ml-2">
                    ({simulation.simulatedPercentage}%)
                  </span>
                </div>
              </div>

              {simulation.isWithinVacancies ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  DENTRO DAS VAGAS
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  ABAIXO DO CORTE
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="text-xs text-zinc-400 font-medium mb-1">Estimativa de Colocação:</div>
              <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                {simulation.estimatedRankingRange}
              </div>
            </div>

            <p className="text-xs text-zinc-500 italic">
              * A nota de corte é calculada com base nos últimos concursos fiscais da banca{" "}
              {selectedBenchmark.banca}.
            </p>
          </div>
        </div>
      </div>

      {/* PLANO DE AÇÃO 72H (ÚLTIMA HORA) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Plano de Ação de Última Hora (Revisão 72h)
            </h2>
            <p className="text-xs text-zinc-400">
              Tópicos de altíssimo peso no edital com maior potencial de ganho rápido de pontos.
            </p>
          </div>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {actionPlan.length} Recomendados
          </span>
        </div>

        <div className="space-y-3">
          {actionPlan.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-lg gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {item.subject}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      item.urgency === "high"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    Peso {item.weight}
                  </span>
                </div>
                <div className="text-sm font-semibold text-zinc-200">{item.topic}</div>
                <div className="text-xs text-zinc-400">{item.reason}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.actionType === "discursive" && (
                  <Link
                    to="/estudo/discursivas"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Treinar Discursiva
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {item.actionType === "flashcards" && (
                  <Link
                    to="/flashcards"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Revisar Cards
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {item.actionType === "lawtags" && (
                  <Link
                    to="/estudo/edital"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Ver LawTags
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {item.actionType === "questions" && (
                  <Link
                    to="/questoes"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Fazer Questões
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
