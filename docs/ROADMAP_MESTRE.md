# APROVADO FISCAL V2 — ROADMAP MESTRE OFICIAL
*Fonte de Verdade Unificada de Arquitetura, Etapas de Engenharia, Fases de Inteligência e Visão Estratégica do Produto*

---

## 1. DIRETRIZES DA FONTE DE VERDADE

Este documento é a **ÚNICA FONTE DE VERDADE** para o planejamento, etapas de engenharia, fases de inteligência e visão estratégica do **Aprovado Fiscal V2**.

- **Regra de Ouro**: Fases e etapas com respaldo direto no código/testes são mantidas como homologadas. Requisitos estratégicos futuros e diretrizes pedagógicas oficiais formam o guia de evolução.
- **Princípio da Não Duplicação**: Módulos e engines existentes (Planner, Knowledge Engine, Review, Evidence, Coach, Socratic, Unified Scheduler) são evoluídos continuamente. Não são criados componentes paralelos duplicados.
- **Execution First**: O Aprovado Fiscal V2 não é um gerador passivo de métricas. Toda inteligência existe para produzir uma consequência prática e responder: *"O que o aluno deve fazer agora?"*.
- **Transparência e Rastreabilidade**: Requisitos novos são classificados por sua posição no ecossistema (Transversal, Evolução de Componente Existente, Etapa 8, Etapa 9 ou Etapa 10) e seu estado real no código (🟢 Implementado, 🟡 Parcial, 🔵 Infraestrutura Existente / Requer Evolução, 🔴 Não Implementado).

---

## 2. VISÃO ESTRATÉGICA OFICIAL DO APROVADO FISCAL V2

> O APROVADO FISCAL não é apenas um planner, banco de questões ou chatbot.
>
> É um sistema de preparação fiscal contínua que entende:
>
> **o aluno + o conteúdo + os materiais + as questões + as bancas + a legislação + o desempenho**
>
> e transforma esses dados em:
>
> **INTELIGÊNCIA → DECISÃO → PRÓXIMA MELHOR AÇÃO.**

### Fluxo Central
```
MATERIAIS + QUESTÕES + LEIS + BANCAS + DESEMPENHO + IA
                      ↓
                 INTELIGÊNCIA
                      ↓
                   DECISÃO
                      ↓
             PRÓXIMA MELHOR AÇÃO
                      ↓
                  EXECUÇÃO
                      ↓
                  FEEDBACK
                      ↓
                RECALIBRAÇÃO
```

---

## 3. PRINCÍPIOS ARQUITETURAIS, PEDAGÓGICOS E UX

### 3.1. Princípio Execution First
> O aluno não entra no APROVADO FISCAL para analisar estatísticas. Ele entra para saber:
> - **O que eu faço agora?**
> - **Com qual material?**
> - **Por quanto tempo?**
> - **Com qual objetivo?**
> - **Como vou saber se aprendi?**

Toda inteligência e processamento do sistema deve convergir para uma ação concreta e guiada na rotina do aluno.

### 3.2. Regra de Ouro UX / Pedagógica
> **Nenhuma informação deve ser apresentada ao aluno apenas porque o sistema consegue calculá-la.**
>
> Toda métrica, estatística, incidência, percentual ou análise deve responder:
> **“O que isso muda no meu estudo?”**

### 3.3. Prioridade ≠ Exclusão
> **Incidência influencia prioridade, mas não determina sozinha o currículo.**

O motor de decisão considera conjuntamente:
$$\text{Prioridade} = f(\text{Incidência}, \text{Importância Estrutural}, \text{Pré-requisitos}, \text{Domínio}, \text{Erros}, \text{Estágio do Ciclo}, \text{Tempo Disponível}, \text{Proximidade da Prova})$$

Nenhum conteúdo é automaticamente eliminado apenas por ter baixa incidência histórica.

### 3.4. Princípio de Evidência Cognitiva
> **Evidência antes de Inteligência. Exposição ≠ Domínio.**

O sistema diferencia semanticamente os sinais cognitivos coletados:
- `practice` (resolução de questões objetivas)
- `remediation` (estudo direcionado pós-erro)
- `review` (repetição espaçada SRS)
- `recall` (recuperação ativa socrática)
- `exposure` (leitura de teoria ou legislação)

Nenhum algoritmo de recomendação ou predição pode tratar simples exposição passiva como domínio real.

### 3.5. UX — Estrutura de Centrais Contextuais (Não poluir com abas infinitas)
A interface organiza-se em 8 centrais principais. As demais funcionalidades surgem de forma contextual dentro dessas áreas:
1. 🏠 **Central de Estudos**: Ação diária — o que fazer agora.
2. 📚 **Materiais (Material Hub)**: Gestão de arquivos, links, vídeos e índice inteligente.
3. 🧠 **Inteligência**: Nível de domínio, incidências, diagnóstico de erros e evolução.
4. 🎯 **Plano**: Ciclos de estudo, disponibilidade, metas e planejamento adaptativo.
5. 📝 **Questões**: Banco de questões, simulados, importações e análise de bancas.
6. 👨‍🏫 **Coach**: Mentoria proativa, recomendações, motivação contextual e intervenções.
7. 🏆 **Concursos**: Radar de editais, concorrência, retificações e compatibilidade.
8. ⚙️ **Configurações**: Integrações, chaves, perfis e preferências.

---

## 4. LINHA ESTRATÉGICA E ARQUITETURA DE CONHECIMENTO

```
                     APROVADO FISCAL
                            ↓
       PERFIL PERMANENTE + RADAR DE CONCURSOS
                            ↓
                 KNOWLEDGE GRAPH FISCAL
                            ↓
        MATERIAIS + QUESTÕES + LEGISLAÇÃO (VADE MECUM)
                            ↓
                  INTELIGÊNCIA DE BANCA
                            ↓
           INCIDÊNCIA + PEGADINHAS + PADRÕES
                            ↓
                    DOMÍNIO DO ALUNO
                            ↓
               REVIEW / ACTIVE LEARNING (SRS)
                            ↓
                     ROI / PRIORIDADE
                            ↓
                      PLANNER ENGINE
                            ↓
                     COACH AUTÔNOMO
                            ↓
                  PRÓXIMA MELHOR TAREFA
                            ↓
                  EXECUÇÃO & FEEDBACK
                            ↓
                     RECALIBRAÇÃO
```

### 4.1. Ciclo Básico Fiscal e Expansão por Maturidade
1. **Ciclo Básico**: Direito Administrativo, Direito Constitucional, Direito Tributário, Contabilidade Geral, Matemática/RLM.
2. **Construção de Base**: O aluno pode iniciar a preparação sem concurso-alvo, consolidando a base fiscal reutilizável.
3. **Expansão Gradual**: A transição para disciplinas específicas (Legislação Tributária Estadual/Municipal, Auditoria, TI, Comércio Internacional) ocorre à medida que a maturidade no Ciclo Básico atinge o nível de consolidação. *Redução de exposição nas básicas não significa abandono.*

### 4.2. Gerenciador de Maturidade Granular
O domínio do aluno é rastreado na hierarquia:
$$\text{Disciplina} \rightarrow \text{Tópico} \rightarrow \text{Subtópico} \rightarrow \text{Conceito / Artigo / Fórmula}$$

Transita entre 5 estados pedagógicos:
$$\text{Fundamentação} \rightarrow \text{Desenvolvimento} \rightarrow \text{Consolidação} \rightarrow \text{Manutenção} \rightarrow \text{Excelência}$$

### 4.3. Três Formas de Contato com o Conteúdo
1. **Mapeamento**: Compreensão do padrão de cobrança da banca, pegadinhas e estrutura das questões.
2. **Teoria**: Consumo de PDFs, vídeo-aulas, lei seca, resumos e materiais do Material Hub.
3. **Revisão Ativa**: Questões objetivas, flashcards, diálogo socrático, caderno de erros e recuperação ativa.

---

## 5. HISTÓRICO E ESTADO ATUAL DAS ETAPAS E FASES (1.0 A 7.7)

### 🟢 ETAPA 1 — Fundação Técnica e Modelo de Conhecimento
- **Objetivo**: Estruturação de dados para Concurso, Edital Verticalizado, Mapeamento por Tópico, LawTags, Sessões de Estudo e Autenticação.
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA**
- **Evidências**: `contests`, `subjects`, `topics`, `law_tags`, `study_sessions`, `attempts`. Módulos em `src/lib/syllabus/`, `src/lib/concursos/`.

### 🟢 ETAPA 2 — Motor Determinístico de Planejamento (Planner Engine Core)
- **Objetivo**: Algoritmo puro de cálculo de prioridade (Peso × Mapeamento × Lacuna), alocação em blocos de tempo e distribuição intercalada Round-Robin.
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA**
- **Evidências**: `src/lib/planner/engine.ts`, `src/lib/planner/availability.ts`.

### 🟢 ETAPA 3 — Knowledge Engine, Diagnostic Engine & Integração Planner
- **Etapa 3.1 — Knowledge Engine & Signals**: Cálculo de acurácia, domínio e confiança por tópico (`src/lib/knowledge/engine.ts`).
- **Etapa 3.2 — Diagnostic Engine**: Mapeamento de lacunas por matéria/tópico (`src/lib/diagnosis/engine.ts`).
- **Etapa 3.3 — Integração Diagnóstico → Planner**: Priorização do estudo orientada pelo nível de domínio real (`src/lib/planner/engine.ts`).
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA**

### 🟢 ETAPA 4 — Motor Determinístico de Revisão (Review Engine)
- **Objetivo**: Algoritmo de espaçamento e repetição espaçada (SRS), ciclos de consolidação e aprendizagem.
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA**
- **Evidências**: `src/lib/review/engine.ts`, `src/lib/review/service.ts`, `src/lib/review/presentation.ts`.

### 🟢 ETAPA 5 — Unified Scheduler
- **Objetivo**: Orquestração integrada de Teoria, Questões, Revisão e Flashcards em uma fila única com capacidade diária controlada.
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA**
- **Evidências**: `src/lib/scheduler/engine.ts`, `src/lib/scheduler/service.ts`.

### 🟢 ETAPA 6 — Banco de Questões, Central de Erros & Evidence Layer
- **Etapas 6.1 a 6.10**: Ingestão, resolução de questões, estatísticas, integração com Central de Erros e atualização do Knowledge Engine (`src/lib/questions/`, `src/lib/error-central/`).
- **Etapas 6.16 a 6.23**: Cognitive Evidence Layer — Coleta idempotente de sinais cognitivos em Teoria, Prática, Recall, Revisão e Remediação (`src/lib/evidence/`).
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA**

---

### 🟢 FASE 7 — SISTEMAS DE INTELIGÊNCIA ARTIFICIAL E ADAPTATIVIDADE

#### 🟢 FASE 7.1 — AI Gateway Real & Cache Persistido
- Camada única de comunicação com a API do Gemini e resiliência via tabela `ai_results`.
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA** (`src/services/ai/gateway.ts`).

#### 🟢 FASE 7.2 — Mentor / Coach de IA Proativo (Coach Intelligence Upgrade)
- Diagnóstico proativo de perfil, sugestão de ritmos e estratégias com prompts validados.
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA** (`src/lib/coach/`).

#### 🟢 FASE 7.3 — Socratic Engine Core & Grounding Jurídico (Professor Fiscal)
- Socratic Core Engine, Banco de Legislação, RAG Jurídico e Persistência Cognitiva.
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA** (`src/lib/socratic/`, `src/lib/legal/`).

#### 🟢 FASE 7.7 — Adaptive Deficit + Intelligent Time Estimate + Adaptive Delta (Anti-Churn)
- **Status**: 🟢 **CONCLUÍDA E HOMOLOGADA** (Homologada em 03/09/2026 com 1.213/1.213 testes passando).
- **Módulos Físicos**:
  - `src/lib/planner/time-estimator.ts` (Fase 7.7.1) — Estimativa bayesiana de tempo.
  - `src/lib/planner/deficit-engine.ts` (Fase 7.7.2) — Gestão inteligente de déficit acumulado.
  - `src/lib/planner/delta-engine.ts` (Fase 7.7.3) — Reconciliação anti-churn de agenda.

---

## 6. ETAPAS FUTURAS E VISÃO DE LONGO PRAZO

### 🔴 ETAPA 8 — SIMULAÇÃO + INTELIGÊNCIA DE PERFORMANCE
- **Status**: 🔴 **NÃO INICIADA**
- **Objetivo**: Medir o candidato em condições reais de prova e transformar performance em evidências acionáveis.
- **Módulos Planejados**:
  - Motor de Simulados (Inéditos, Oficiais e Customizados).
  - Controle de Velocidade, Raciocínio, Precisão e Gestão de Tempo de Prova.
  - Análise Temporal de Fadiga e Queda de Desempenho ao Longo do Simulado.
  - Processamento de Simulados como Sinais de Evidência Cognitiva no Knowledge Engine.

### 🔴 ETAPA 9 — INTELIGÊNCIA PREDITIVA + OTIMIZAÇÃO PARA APROVAÇÃO
- **Status**: 🔴 **NÃO INICIADA**
- **Objetivo**: Transformar histórico, simulados e evidências em predição de nota, risco de reprovação e cenários de otimização.
- **Módulos Planejados**:
  - Estimativa de Readiness e Probabilidade de Aprovação (Tratada formalmente como estimativa, nunca garantia).
  - Identificação Automática de Gap-to-Approval por Disciplina e Tópico.
  - Simulação de Cenários (*"E se eu dedicar +2h/semana para Contabilidade?"*).
  - Recomendação de Intervenção Preventiva antes da Estagnação.

### 🔴 ETAPA 10 — ECOSSISTEMA APROVADO FISCAL COMPLETO
- **Status**: 🔴 **NÃO INICIADA**
- **Objetivo**: Integrar conhecimento, materiais, bancas, concursos, IA, Coach e comunidade em um ecossistema coeso.
- **Módulos Planejados**:
  - Material Hub Integrado com RAG de Materiais do Próprio Aluno.
  - Grafo de Conhecimento Fiscal Transversal (Conectando Lei seca, Questões, Concursos e Conceitos).
  - Bank Intelligence Deep Profiling (Análise de estilo linguístico e pegadinhas recorrentes por banca).
  - Mnemônicos e Bizus Dinâmicos Personalizados com Feedback do Aluno.

---

## 7. MATRIZ OBRIGATÓRIA DE REQUISITOS E COMPONENTES

| Requisito / Funcionalidade | Estado Atual | Enquadramento / Etapa | Dependências Diretas | Observação e Diretriz de Implementação |
| :--- | :---: | :--- | :--- | :--- |
| **Ciclo Básico Fiscal** | 🟢 Implementado | Transversal / Etapa 1 | Syllabus / Concursos | Suporta início sem concurso fixo e transição gradual para matérias específicas. |
| **Gerenciador de Maturidade Granular** | 🔵 Infra. Existente | Evoluir Knowledge Engine (Etapa 3) | `src/lib/knowledge/` | Expandir de percentual simples para 5 estados (Fundamentação a Excelência). |
| **Material Hub (Índice Inteligente)** | 🟡 Parcial | Etapa 10 / Evoluir Materiais | `src/routes/.../edital.tsx` | Mapeia materiais para a árvore de tópicos (PDFs, Vídeos, LawTags). |
| **Grafo de Conhecimento Fiscal** | 🔵 Infra. Existente | Etapa 10 / Knowledge Engine | `src/lib/legal/`, `src/lib/questions/` | Conecta Matéria $\rightarrow$ Tópico $\rightarrow$ Artigo $\rightarrow$ Questão $\rightarrow$ Erro. |
| **Material Intelligence (Visão sobre Material)** | 🔴 Não Impl. | Etapa 10 | Material Hub, RAG Jurídico | Exibe incidência, pegadinhas e questões diretamente no material de leitura. |
| **Mapa de Incidência dentro do Material** | 🟡 Parcial | Etapa 10 / Concursos | `fiscalKnowledgeBase.ts` | Exibe calor de incidência por banca (FGV, Cebraspe, FCC) em cada tópico/artigo. |
| **Prioridade ≠ Exclusão** | 🟢 Implementado | Transversal / Planner (Etapa 2) | `src/lib/planner/engine.ts` | Algoritmo balanceia peso, incidência, domínio e lacuna de estudo. |
| **Três Formas de Contato (Mapeamento, Teoria, Revisão)** | 🟢 Implementado | Transversal / Scheduler | `src/lib/scheduler/` | Suporta alternância entre leitura, exercícios e revisão ativa. |
| **Perfil Cognitivo por Disciplina** | 🟡 Parcial | Evoluir Coach (Fase 7.2) | `src/lib/coach/` | Ajusta o formato preferencial de estudo conforme o rendimento real por matéria. |
| **Matemática / Exatas Adaptativa** | 🟡 Parcial | Evoluir Socratic (Fase 7.3) | `src/lib/socratic/` | Diagnostica pré-requisitos antes de aumentar volume de exercícios em exatas. |
| **Coach Autônomo Decision System** | 🟢 Implementado | Evoluir Coach (Fase 7.2) | `src/lib/coach/service.ts` | Atua como motor de decisão e mentoria proativa alimentado por IA. |
| **Coach Motivacional Contextual** | 🟡 Parcial | Evoluir Coach (Fase 7.2) | `src/lib/coach/` | Dispara mensagens e incentivos baseados em marcos reais e recuperação. |
| **Bizu Engine / Pegadinhas / Mnemônicos** | 🟡 Parcial | Etapa 10 / Knowledge | `src/components/bancas/` | Apresenta LawTags, bizus e pegadinhas no Vade Mecum e nas sessões. |
| **Resumo Multifonte / Sintetizador** | 🔴 Não Impl. | Etapa 10 / RAG | AI Gateway, Material Hub | Sintetiza conceitos combinando lei, materiais e questões com indicação de fontes. |
| **Exemplo de Caso Concreto** | 🟡 Parcial | Evoluir Socratic (Fase 7.3) | `src/lib/legal/` | Professor Fiscal fornece aplicações práticas para normas abstratas. |
| **Intelligent Time Estimate** | 🟢 Implementado | Fase 7.7 (Planner) | `src/lib/planner/time-estimator.ts` | Suavização bayesiana para duração contextual de tarefas. |
| **Adaptive Deficit Management** | 🟢 Implementado | Fase 7.7 (Planner) | `src/lib/planner/deficit-engine.ts` | Processa atrasos sem gerar avalanches de re-agendamento. |
| **Adaptive Delta (Anti-Churn)** | 🟢 Implementado | Fase 7.7 (Planner) | `src/lib/planner/delta-engine.ts` | Preserva estabilidade da agenda contra variações irrelevantes. |
| **Jornada / Monitor de Fadiga** | 🔴 Não Impl. | Evoluir Evidence (Etapa 6) | `src/lib/evidence/` | Detecta queda de produtividade em sessões longas e sugere pausas. |
| **"O que estudar hoje" (Ação Concreta)** | 🟢 Implementado | Transversal / UX | `src/routes/.../dashboard/` | Apresenta tarefas diárias completas com duração, meta e material. |
| **IA que Imita Padrão de Banca** | 🔴 Não Impl. | Etapa 10 / Questões | Questões, AI Gateway | Sintetiza exercícios inéditos no estilo exato da banca, rotulando origem. |
| **Detecção de Indício de Gerador IA** | 🔴 Não Impl. | Transversal / Questões | `src/lib/questions/` | Rotula transparentemente questões sintéticas e níveis de confiança. |
| **Bank Intelligence Deep Profiling** | 🟡 Parcial | Etapa 10 / Concursos | `src/components/bancas/` | Análise do perfil histórico e pegadinhas de Cebraspe, FGV e FCC. |
| **Simulação + Performance** | 🔴 Não Impl. | **Etapa 8** | Questions, Evidence | Testes de prova completa, controle de tempo, cadência e fadiga. |
| **Inteligência Preditiva & Readiness** | 🟡 Parcial | **Etapa 9** | `ReadinessAuditor.tsx` | Auditor de Prontidão atual evoluirá para modelos estocásticos de aprovação. |
| **Expansão Curricular por Maturidade** | 🟢 Implementado | Transversal / Syllabus | `src/lib/syllabus/` | Transição de base geral para editais específicos sob demanda. |
| **UX em 8 Centrais Contextuais** | 🟢 Implementado | Transversal / UX | `src/components/AppShell` | NAVEGAÇÃO em centrais unificadas sem criação desnecessária de abas. |
| **Tooltips com Racional das Métricas** | 🟢 Implementado | Transversal / UX | Interface Geral | Métricas acompanhadas de justificativas e explicações transparentes. |

---

## 8. INTEGRALIDADE DOS BENCHMARKS REFERENCIADOS

O Aprovado Fiscal V2 absorve os melhores conceitos do mercado fiscal sem copiar código ou estruturas proprietárias:
- **Gurujá**: Estruturação de ciclos de estudo, metas diárias segregadas por etapa pedagógica, acompanhamento contínuo e intervenção adaptativa.
- **LS Concursos**: Comandos de estudo objetivos e diretos, mapas de calor por relevância, revisão direcionada por falhas e análise pontual da legislação.
- **Radegondes**: Foco em materiais estritamente orientados ao padrão de cobrança, esquemas de memorização e integração contínua com jurisprudência.
- **Mentoria Fiscal**: Estudo reverso planejado, identificação do Pareto Fiscal (20% do edital responsável por 80% dos pontos), análise do DNA da banca e simulados estratégicos.
- **Bizzu.ai**: Destaques visuais de pegadinhas, alertas de comandos legislativos sensíveis e mnemonização contextualmente acionada.

---

## 9. SEQUÊNCIA DE DEPENDÊNCIAS DAS ETAPAS SEGUINTES

```
                        FASE 7.7 (CONCLUÍDA)
                                 │
                                 ▼
         ETAPA 8 — SIMULAÇÃO + INTELIGÊNCIA DE PERFORMANCE
                                 │
                                 ▼
      ETAPA 9 — INTELIGÊNCIA PREDITIVA + OTIMIZAÇÃO PARA APROVAÇÃO
                                 │
                                 ▼
               ETAPA 10 — ECOSSISTEMA APROVADO FISCAL
```

---

## 10. VEREDITO FINAL DA CONSOLIDAÇÃO

### 🟢 ROADMAP MESTRE CONSOLIDADO E ETAPA 8 LIBERADA PARA AUDITORIA DE PRONTIDÃO

- **Documento oficial**: `/docs/ROADMAP_MESTRE.md` consolidado com sucesso.
- **Fase 7.7**: Mantida como **🟢 CONCLUÍDA E HOMOLOGADA**.
- **Próximo Passo**: Nenhuma linha de código foi escrita nesta execução. O sistema está pronto para a **Auditoria de Prontidão da Etapa 8 (Simulação + Inteligência de Performance)**.
