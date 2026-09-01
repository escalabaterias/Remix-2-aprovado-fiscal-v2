import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  User,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COACH_QUICK_ACTIONS,
  buildStudentProfileContext,
  processCoachChat,
} from "@/lib/coach/coachEngine";
import type { CoachMessage, StudentProfileContext } from "@/lib/coach/types";

export function CoachPanel({ initialCustomPrompt }: { initialCustomPrompt?: string }) {
  const [profile, setProfile] = useState<StudentProfileContext | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const promptProcessedRef = useRef(false);

  // Inicializa o perfil e a mensagem de boas-vindas do Coach
  useEffect(() => {
    const context = buildStudentProfileContext();
    setProfile(context);

    const initialMessage: CoachMessage = {
      id: "msg-welcome",
      sender: "coach",
      content: `### 🤖 Olá, futuro Auditor Fiscal! Sou seu Coach IA.

Analisei o seu perfil de desempenho integrado para o concurso **${context.targetExam}**:

- 📈 **Taxa Global de Acertos**: **${context.globalScore}%**
- 🎯 **Pontos de Fracasso Recente**: **${context.weakSubjects.join(", ")}**
- 🎴 **Flashcards Vencidos (SM-2)**: **${context.dueFlashcardsCount} cartões**
- 📅 **Revisões Pendentes no Planner**: **${context.pendingReviewsCount} tópicos**

Como posso direcionar seu estudo de hoje? Selecione um dos atalhos rápidos ou digite sua dúvida abaixo:`,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        "Explicar exatas passo a passo",
        "Analisar meu Caderno de Erros",
        "Direcionamento para reta final da SEFAZ",
      ],
    };

    setMessages([initialMessage]);

    // Se houver prompt customizado inicial (ex: vindo da análise de pegadinhas), enviar automaticamente
    if (initialCustomPrompt && !promptProcessedRef.current) {
      promptProcessedRef.current = true;
      setTimeout(() => {
        handleSendMessage(initialCustomPrompt);
      }, 300);
    }
  }, [initialCustomPrompt]);

  // Rola automaticamente para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Enviar Mensagem do Usuário
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: CoachMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const coachMsg = await processCoachChat(text, messages);
      setMessages((prev) => [...prev, coachMsg]);
    } catch {
      const errorMsg: CoachMessage = {
        id: `err-${Date.now()}`,
        sender: "coach",
        content:
          "Desculpe, tive um problema ao processar sua requisição. Por favor, tente novamente.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    if (!profile) return;
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: "coach",
        content: `Sessão reiniciada! Como posso orientar seus estudos para a **${profile.targetExam}**?`,
        timestamp: new Date().toISOString(),
        suggestedActions: [
          "Explicar exatas passo a passo",
          "Analisar meu Caderno de Erros",
          "Direcionamento para reta final da SEFAZ",
        ],
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[550px] space-y-4">
      {/* Header do Coach & Resumo do Perfil */}
      <div className="panel p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Coach Fiscal IA
              </h2>
              <Badge
                variant="secondary"
                className="gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado ao Perfil
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Mentor socrático especialista em Carreiras Fiscais & Algoritmo de Aprendizado
            </p>
          </div>
        </div>

        {/* Resumo de Desempenho do Aluno */}
        {profile && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-card border border-border flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Desempenho:</span>
              <span className="font-semibold font-mono text-foreground">
                {profile.globalScore}%
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-card border border-border flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-muted-foreground">Flashcards:</span>
              <span className="font-semibold font-mono text-foreground">
                {profile.dueFlashcardsCount} devidos
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-card border border-border flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-muted-foreground">Revisões:</span>
              <span className="font-semibold font-mono text-foreground">
                {profile.pendingReviewsCount} pendentes
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetChat}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Reiniciar conversa"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reiniciar
            </Button>
          </div>
        )}
      </div>

      {/* Atalhos de Interação Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {COACH_QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => handleSendMessage(action.label)}
            disabled={isLoading}
            className="panel p-3 text-left hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between group text-xs font-medium"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-foreground">{action.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>

      {/* Área Principal de Mensagens do Chat */}
      <div className="flex-1 panel p-4 sm:p-6 overflow-y-auto space-y-4 min-h-[300px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "coach" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 mt-1">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-xl p-4 space-y-3 ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground font-medium self-end"
                  : "bg-card border border-border text-foreground shadow-sm"
              }`}
            >
              {/* Conteúdo da Mensagem com formatação simples */}
              <div className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</div>

              {/* Data/Hora */}
              <div
                className={`text-[10px] ${
                  msg.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                } text-right font-mono`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* Botões de Ação Sugerida */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5 border-t border-border/40">
                  {msg.suggestedActions.map((actionText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(actionText)}
                      disabled={isLoading}
                      className="px-2.5 py-1 rounded-md bg-muted/80 hover:bg-primary/20 hover:text-primary text-[11px] font-medium text-muted-foreground transition-colors cursor-pointer border border-border/50 flex items-center gap-1"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {actionText}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border mt-1">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Bot className="h-4 w-4 animate-bounce" />
            </div>
            <div className="bg-card border border-border text-muted-foreground rounded-xl p-3 text-xs flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />O Professor Fiscal está
              consultando seu histórico de erros e elaborando a resposta...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Envio de Mensagem */}
      <div className="flex gap-2">
        <Input
          id="coach-input"
          placeholder="Pergunte ao Coach Fiscal sobre matérias, revisão ou plano de estudos..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1 text-sm bg-card border-border"
        />
        <Button
          id="coach-send-btn"
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim() || isLoading}
          className="gap-2 px-5"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Enviar</span>
        </Button>
      </div>
    </div>
  );
}
