# ETAPA 8 OFICIAL — SIMULAÇÃO + INTELIGÊNCIA DE PERFORMANCE
## Documento de Arquitetura, Modelagem e Engenharia de Software

---

## 1. OBJETIVO GERAL
Transformar o APROVADO FISCAL do ambiente de estudo e treino fracionado para um **ambiente de simulação de prova de alta fidelidade**, proporcionando ao estudante de concursos fiscais e de controle:
1. **Configuração flexível e determinística de provas/simulados** (por concurso, edital, banca, disciplinas, pesos e regras de penalização como Cebraspe ou padrão múltipla escolha);
2. **Execução realista e cronometrada** com controle estrito de tempo no servidor/persistência (proteção contra manipulação de relógio do cliente, pausa/retomada idêntica a regras de prova e resiliência a refresh/quedas de conexão);
3. **Mapeamento de comportamento intra-prova** (tempo por questão, tempo por disciplina, trocas de alternativa, questões puladas, revisadas, marcadas para revisão e detecção de curva de fadiga);
4. **Inteligência pós-prova aprofundada** (nota bruta, nota líquida com penalidade, taxa de acerto ponderada por peso de disciplina, perfil de velocidade x precisão e detecção de temas frágeis);
5. **Realimentação unificada do ecossistema pedagógico** (emissão de evidências cognitivas em lote para `user_topic_knowledge`, criação de entradas taxonômicas na `Central de Erros`, agendamento de tópicos críticos no `Review Engine` e ajuste de prioridade no `Planner/Unified Scheduler`).

---

## 2. CONCEITOS DO DOMÍNIO DE SIMULAÇÃO

* **Simulado (Simulation Config / Exam Definition):** A especificação formal e regras da avaliação (ex: "Simulado Geral SEFAZ-SP — Banca FCC — 100 Questões — 4h30min — Pesos 1 e 2").
* **Prova Gerada (Exam Instance):** O conjunto ordenado e balanceado de questões selecionadas determinística ou pseudo-aleatoriamente a partir do Banco de Questões existente, respeitando a distribuição de disciplinas e tópicos.
* **Sessão de Prova (Exam Attempt / Execution Session):** A instância temporal de execução pelo candidato, contendo timestamps de início, término, pausas acumuladas, tempo restante e status da máquina de estados.
* **Item de Prova (Exam Question Item):** A amarração entre a questão, sua posição na prova, o peso atribuído, a resposta assinalada, a marcação de dúvida ("marcada para revisão"), histórico de trocas de alternativa e tempo líquido gasto na tela da questão.
* **Tentativa / Resposta Oficial (Exam Attempt Item):** O registro definitivo da submissão processado pelo motor de correção e conectado ao `question_attempts` do sistema.
* **Relatório de Performance (Exam Analytics Report):** O diagnóstico holístico pós-prova consolidando nota, tempo, velocidade, fadiga e recomendações corretivas.

---

## 3. PRINCÍPIO ARQUITETURAL: REUTILIZAÇÃO DO BANCO EXISTENTE
A Etapa 8 **NÃO** duplica tabelas de questões ou sistemas paralelos de cadastro de itens.
O ecossistema existente já dispõe de:
* Tabela `questions` (com enunciado, alternativas JSONB, resposta correta, disciplina, tópico, concurso, banca, dificuldade, tags e metadados);
* Tabela `question_stats` (estatísticas acumuladas do usuário por questão);
* Tabela `question_attempts` (registro histórico de tentativas com modo `simulado`);
* Tabelas `question_sets` e `question_set_items` (estrutura fundamental de listas/conjuntos de questões);
* `AttemptService`, `KnowledgeEngine`, `ErrorCentral`, `ReviewEngine`, `EvidenceEngine`, `DiagnosticEngine` e `UnifiedScheduler`.

A Etapa 8 atua como uma **camada de orquestração de alto nível** sobre essas fundações, introduzindo apenas as estruturas de governança temporal e telemetria de prova necessárias para garantir fidelidade de concurso.

---

## 4. FLUXO COMPLETO DO CICLO DE SIMULAÇÃO

```text
       [BANCO DE QUESTÕES EXISTENTE]
                    ↓
   [1. CONFIGURAÇÃO DO SIMULADO]
   (Edital, Disciplinas, Pesos, Banca, Tempo, Regra de Pontuação)
                    ↓
     [2. GERAÇÃO DETERMINÍSTICA DA PROVA]
   (Exam Generator Engine: Seleção balanceada sem duplicatas)
                    ↓
    [3. EXECUÇÃO CRONOMETRADA & RESILIENTE]
   (Exam Session Engine: Timers auditáveis, Navegação, Salva Automática)
                    ↓
         [4. SUBMISSÃO & FINALIZAÇÃO]
   (Transição atômica para SUBMITTED / PROCESSING)
                    ↓
        [5. CORREÇÃO & PONTUAÇÃO REALISTA]
   (Exam Scoring Engine: Nota Líquida, Pesos, Penalidades Cebraspe/FCC)
                    ↓
     [6. ANÁLISE DE PERFORMANCE & COMPORTAMENTO]
   (Exam Analytics Engine: Velocidade, Precisão, Fadiga, Radar por Matéria)
                    ↓
   [7. EMISSÃO DE EVIDÊNCIAS COGNITIVAS EM LOTE]
   (Evidence Layer: tipo "practice" com modo "simulado")
                    ↓
 [8. REALIMENTAÇÃO DOS MOTORES ADAPTATIVOS]
   ┌───────────────┬─────────────────┬────────────────┐
   ↓               ↓                 ↓                ↓
[Knowledge]   [Error Central]  [Review Engine]   [Planner Adaptativo]
(Mastery/      (Erros em prova  (Revisões de      (Boost de prioridade
Confiança)     classificados)   temas errados)    nos tópicos frágeis)
```

---

## 5. MÁQUINA DE ESTADOS DA SESSÃO DE PROVA

```text
       ┌───────────────┐
       │     DRAFT     │ (Configuração do simulado em edição)
       └───────┬───────┘
               │ build_exam()
               ▼
       ┌───────────────┐
       │     READY     │ (Caderno de prova gerado e aguardando início)
       └───────┬───────┘
               │ start_session()
               ▼
       ┌───────────────┐  pause_session()   ┌───────────────┐
       │  IN_PROGRESS  │ ─────────────────► │    PAUSED     │
       │               │ ◄───────────────── │ (se permitido)│
       └───────┬───────┘  resume_session()  └───────────────┘
               │
               │ submit() OU time_expired()
               ▼
       ┌───────────────┐
       │   SUBMITTED   │ (Respostas congeladas; cronômetro encerrado)
       └───────┬───────┘
               │ process_results()
               ▼
       ┌───────────────┐
       │  PROCESSING   │ (Correção, cálculo de métricas e disparo de evidências)
       └───────┬───────┘
               │ finalize()
               ▼
       ┌───────────────┐
       │   ANALYZED    │ (Relatório disponível para consulta e feedback)
       └───────┬───────┘
               │ (se o aluno desistir formalmente antes de submeter)
               ▼
       ┌───────────────┐
       │   ABANDONED   │ (Histórico arquivado com cálculo parcial)
       └───────────────┘
```

---

## 6. ARQUITETURA DE ENGINES E SERVICES PROPOSTOS

### 6.1. Novos Motores Puros (Deterministic Engines) em `src/lib/simulados/`:
1. **`ExamGeneratorEngine` (`engine/generator.ts`):**
   * Seleção determinística ou pseudo-aleatória (via seed) de questões baseada nos critérios de distribuição (disciplina, tópico, banca, dificuldade e novidade).
   * Prevenção estrita de duplicidade de questões no mesmo simulado.
   * Validação de cobertura mínima do edital.
2. **`ExamScoringEngine` (`engine/scoring.ts`):**
   * Cálculo de nota bruta (acertos / total).
   * Aplicação de pesos por disciplina (ex: Conhecimentos Específicos peso 2, Básicos peso 1).
   * Modelos de penalização configuráveis:
     * *Standard:* Apenas acertos somam pontos.
     * *Cebraspe Clássico:* Cada erro anula um acerto (+1 ponto acerto, -1 ponto erro, 0 em branco).
     * *Cebraspe Proporcional:* Erro anula fração de ponto (ex: -0.5 ou -0.25).
     * *Critério de Corte por Disciplina:* Verificação de eliminação se atingir mínimo exigido por matéria.
3. **`ExamAnalyticsEngine` (`engine/analytics.ts`):**
   * Tempo médio por questão e tempo por disciplina.
   * Radar de consistência: correlação entre tempo gasto e acerto (questões rápidas acertadas vs. demoradas erradas).
   * Detecção de curva de fadiga (desempenho no primeiro terço da prova vs. terço final).
   * Análise de comportamento: taxa de acerto em questões alteradas (quando o aluno mudou a alternativa, melhorou ou piorou?).
4. **`ExamTimerEngine` (`engine/timer.ts`):**
   * Cálculo determinístico de tempo restante e expiração baseado em `server_started_at`, `server_now`, `deadline_at` e `accumulated_pause_seconds`.

### 6.2. Serviços de Integração (Side Effects & Supabase) em `src/lib/simulados/`:
1. **`ExamConfigService` (`services/config-service.ts`):** Gestão de templates de simulados e configurações de prova.
2. **`ExamExecutionService` (`services/execution-service.ts`):** Orquestração de início, navegação, auto-save atômico de respostas parciais, pausas e submissão final.
3. **`ExamIntegrationService` (`services/integration-service.ts`):** Emissão em lote de tentativas para `attempt-service`, atualização de `user_topic_knowledge`, geração de `error_entries` e agendamento de revisões de tópicos com baixo desempenho.

---

## 7. MODELAGEM DE DADOS E CONTRATOS (REFINADA — ETAPA 8.1)

Para suportar o rigor de auditoria, governança temporal e telemetria comportamental sem sobrecarregar `question_sets`, define-se a seguinte estrutura relacional refinada:

### 7.1. Entidades e Schema Supabase:
1. **`exam_templates` (Configurações / Templates de Prova):**
   * `id` (UUID PK default `gen_random_uuid()`)
   * `user_id` (UUID FK `auth.users` NOT NULL)
   * `contest_id` (UUID FK `contests` NULLABLE)
   * `title` (text NOT NULL)
   * `description` (text NULLABLE)
   * `scoring_rule` (text NOT NULL CHECK: `standard`, `cebraspe_1_for_1`, `cebraspe_half`, `custom`)
   * `negative_marking_penalty` (numeric DEFAULT 0.0)
   * `time_limit_minutes` (int NOT NULL)
   * `allow_pauses` (boolean DEFAULT false)
   * `distribution_config` (JSONB NOT NULL)
   * `is_official_contest_template` (boolean DEFAULT false)
   * `created_at` (timestamptz DEFAULT `now()`)
   * `updated_at` (timestamptz DEFAULT `now()`)

2. **`exam_sessions` (Execuções / Sessões de Prova):**
   * `id` (UUID PK default `gen_random_uuid()`)
   * `user_id` (UUID FK `auth.users` NOT NULL)
   * `template_id` (UUID FK `exam_templates` NULLABLE)
   * `contest_id` (UUID FK `contests` NULLABLE)
   * `set_id` (UUID FK `question_sets` NOT NULL)
   * `status` (text NOT NULL CHECK: `ready`, `in_progress`, `paused`, `submitted`, `processing`, `analyzed`, `abandoned`)
   * `started_at` (timestamptz NULLABLE)
   * `ended_at` (timestamptz NULLABLE)
   * `total_time_seconds` (int NULLABLE)
   * `time_limit_seconds` (int NOT NULL)
   * `accumulated_pause_seconds` (int DEFAULT 0)
   * `last_paused_at` (timestamptz NULLABLE)
   * `last_resumed_at` (timestamptz NULLABLE)
   * `deadline_at` (timestamptz NULLABLE — AUTORIDADE TEMPORAL SERVIDOR)
   * `gross_score` (numeric NULLABLE)
   * `net_score` (numeric NULLABLE)
   * `max_possible_score` (numeric NULLABLE)
   * `accuracy_percentage` (numeric NULLABLE)
   * `performance_summary` (JSONB NULLABLE)
   * `version` (int DEFAULT 1 NOT NULL — CONCORRÊNCIA OTIMISTA)
   * `created_at` (timestamptz DEFAULT `now()`)
   * `updated_at` (timestamptz DEFAULT `now()`)

3. **`exam_session_answers` (Estado Atual de Resposta por Questão):**
   * `id` (UUID PK default `gen_random_uuid()`)
   * `session_id` (UUID FK `exam_sessions` ON DELETE CASCADE NOT NULL)
   * `question_id` (UUID FK `questions` NOT NULL)
   * `user_id` (UUID FK `auth.users` NOT NULL)
   * `position` (int NOT NULL)
   * `subject_id` (UUID FK `subjects` NOT NULL)
   * `topic_id` (UUID FK `topics` NOT NULL)
   * `weight` (numeric DEFAULT 1.0 NOT NULL)
   * `chosen_answer` (text NULLABLE)
   * `is_correct` (boolean NULLABLE)
   * `is_flagged_for_review` (boolean DEFAULT false NOT NULL)
   * `answer_change_count` (int DEFAULT 0 NOT NULL)
   * `first_chosen_answer` (text NULLABLE)
   * `time_spent_seconds` (int DEFAULT 0 NOT NULL)
   * `order_of_interaction` (int NULLABLE)
   * `attempt_id` (UUID FK `question_attempts` NULLABLE)
   * `updated_at` (timestamptz DEFAULT `now()`)
   * Unique constraint: `UNIQUE(session_id, question_id)`

4. **`exam_session_events` (Telemetria Comportamental Append-Only):**
   * `id` (UUID PK default `gen_random_uuid()`)
   * `session_id` (UUID FK `exam_sessions` ON DELETE CASCADE NOT NULL)
   * `question_id` (UUID FK `questions` NULLABLE)
   * `user_id` (UUID FK `auth.users` NOT NULL)
   * `event_type` (text NOT NULL CHECK: `answer_selected`, `answer_changed`, `flag_toggled`, `question_viewed`, `session_paused`, `session_resumed`, `session_submitted`)
   * `payload` (JSONB DEFAULT '{}'::jsonb NOT NULL)
   * `created_at` (timestamptz DEFAULT `now()` NOT NULL)

---

## 8. SEGURANÇA, CONCORRÊNCIA E INTEGRIDADE TEMPORAL (AUDITADAS)

1. **Autoridade Temporal Severa (Server `now()`):**
   * O cliente nunca dita a data de início ou o término real da prova.
   * `started_at` e `deadline_at` são gravados via `now()` no banco/RPC.
   * Na submissão ou salvamento de resposta, verifica-se `now() <= deadline_at + tolerance_buffer` (5 segundos). Se estourado, o status é automaticamente convertido para `SUBMITTED` e bloqueado.
2. **Pausas Auditáveis:**
   * Em modos onde pausa é permitida, ao retomar (`resume_session`), o incremento de tempo pausado é calculado no servidor: `accumulated_pause_seconds = accumulated_pause_seconds + (now() - last_paused_at)`. Em seguida, `deadline_at` é recalculado estritamente.
3. **Concorrência e Duas Abas (Optimistic Locking & Unique Constraints):**
   * A coluna `version` em `exam_sessions` previne race conditions em mudanças de estado.
   * A constraint `UNIQUE(session_id, question_id)` garante que requisições paralelas de auto-save executem um `UPSERT` seguro sem duplicação.
4. **Row Level Security (RLS) Rígido:**
   * Políticas RLS com `auth.uid() = user_id` em 100% das 4 tabelas (`exam_templates`, `exam_sessions`, `exam_session_answers`, `exam_session_events`).

---

## 9. MAPA DE TELAS E EXPERIÊNCIA DE USUÁRIO (UI/UX)

* `/simulados` (Hub de Simulados): Lista de simulados disponíveis, histórico de simulados realizados, métricas agregadas de simulados e botão de novo simulado.
* `/simulados/novo` (Criador de Simulado): Construtor intuitivo permitindo escolher concurso-alvo, disciplinas, bancas, número de questões, tempo total e regras de penalidade.
* `/simulados/:id/prova` (Ambiente de Prova Limpo e Focado):
  * Header compacto: Cronômetro persistente com alertas visuais (30min, 10min, 5min), progresso de preenchimento e botão de finalizar.
  * Painel Central: Enunciado com tipografia nítida, alternativas de fácil clique (área de toque >= 44px) e atalhos de teclado (A, B, C, D, E, Pular, Marcar).
  * Drawer / Barra Lateral de Navegação: Mapa de questões em grade compacta indicando estado (Respondida, Em Branco, Marcada para Revisão, Questão Atual).
* `/simulados/:id/resultado` (Painel Analítico Pós-Simulado):
  * Cartão de Nota Líquida e Percentual com indicação de aprovação no corte.
  * Gráfico de Desempenho por Disciplina (Radar / Barras) comparando nota obtida vs. meta.
  * Curva de Tempo e Velocidade: tempo médio por matéria e detecção de gargalos de tempo.
  * Lista de Revisão da Prova: Gabarito comentado de todas as questões com filtro por erros, acertos e questões marcadas.
  * Botão de Ação Direta: "Enviar Tópicos Frágeis para o Plano de Estudos" e "Revisar Erros na Central de Erros".

---

## 10. ESTRATÉGIA DE TESTABILIDADE

1. **Testes Unitários de Motores Puros (Vitest):**
   * `generator.test.ts`: Validação de distribuição exata por disciplina, ausência de questões repetidas, cumprimento de pesos e respeito a seeds determinísticas.
   * `scoring.test.ts`: Validação de fórmula padrão, Cebraspe (+1/-1 e frações), pesos por matéria e critérios de eliminação por corte mínimo.
   * `analytics.test.ts`: Validação de cálculo de velocidade, trocas de alternativa e detecção matemática de curva de fadiga.
   * `timer.test.ts`: Validação de cálculo de tempo restante em cenários de múltiplos intervalos de pausa e expiração.
2. **Testes de Integração de Serviços:**
   * `execution-service.test.ts`: Ciclo completo de criação de sessão, respostas parciais, recuperação de estado após refresh e finalização atômica.
   * `integration-service.test.ts`: Verificação do disparo em lote para `AttemptService`, atualização de `user_topic_knowledge` e inserções na `Central de Erros`.

---

## 11. DECOMPOSIÇÃO EM FASES INTERNAS RECOMENDADA

```text
ETAPA 8 OFICIAL — SIMULAÇÃO + INTELIGÊNCIA DE PERFORMANCE
│
├── [CONCLUÍDA] 8.1: Modelagem de Dados & Tipos Contratuais (exam_templates, exam_sessions, exam_session_answers, exam_session_events)
│                     ↳ Migration: 20260831150000_etapa8_1_simulados_domain.sql
│                     ↳ Contratos: src/lib/simulados/types.ts & src/lib/simulados/schemas.ts
│                     ↳ Testes: src/lib/simulados/domain.test.ts (Aprovado)
├── 8.2: Motor de Geração e Distribuição de Provas (ExamGeneratorEngine + Testes)
├── 8.3: Motor de Pontuação Realista & Penalidades (ExamScoringEngine + Testes)
├── 8.4: Motor de Execução, Cronômetro Auditável & Resiliência (ExamExecutionService + Testes)
├── 8.5: Motor de Analytics e Inteligência de Performance (ExamAnalyticsEngine + Testes)
├── 8.6: Pipeline de Integração Cognitiva em Lote (Knowledge, Error Central, Review e Planner)
├── 8.7: Interface de Usuário — Construtor e Hub de Simulados (/simulados, /simulados/novo)
├── 8.8: Interface de Usuário — Ambiente de Prova Cronometrado (/simulados/:id/prova)
└── 8.9: Interface de Usuário — Relatório Analítico Pós-Prova (/simulados/:id/resultado) + Homologação
```

---

## 12. DEPENDÊNCIAS E RISCOS

* **Dependências:** Todas as etapas fundamentais pré-requisitas (1 a 7) estão 100% concluídas e testadas (1254/1254 testes verdes). Não há blockers herdados.
* **Riscos Arquiteturais & Mitigações:**
  * *Risco P1 (Concorrência em auto-save rápido de respostas):* Mitigado com debounce no cliente e operações atômicas de upsert no banco via `session_id + question_id`.
  * *Risco P1 (Diferença de relógio entre cliente e servidor):* Mitigado com cálculo de tempo ancorado estritamente em timestamps do banco (`started_at`, `accumulated_pause_seconds`, `deadline_at`).
  * *Risco P2 (Sobrecarga no banco ao submeter 100+ questões de uma vez):* Mitigado agrupando inserções em lote no `AttemptService` e transações em lote para o Knowledge Engine.
