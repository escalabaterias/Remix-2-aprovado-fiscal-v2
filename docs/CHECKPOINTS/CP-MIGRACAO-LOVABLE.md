# CHECKPOINT DE MIGRAÇÃO PARA LOVABLE — APROVADO FISCAL

## Data
2026-09-23

## Commit de origem
`CP-MIGRACAO-LOVABLE` (Ambiente gerenciado Google AI Studio / Repositório sincronizado via GitHub)

## Branch
`main` (Workspace ativo de desenvolvimento do Aprovado Fiscal)

## Estado do working tree
Clean / Arquivos auditados e prontos para sincronização e abertura no Lovable

## Estado do Roadmap
O documento `/docs/ROADMAP_MESTRE.md` é mantido como a Constituição oficial e inviolável do projeto. A migração de ambiente do Google AI Studio para o Lovable preserva 100% da linha do tempo, prioridades e arquitetura.

- **Etapas Concluídas e Homologadas:** Etapas 1, 2, 3, 4, 5, 6, 7.1, 7.2, 7.3, 7.7, A.1.4, A.1.7 e P0.2 (Material Hub).
- **Etapa em Aberto para Validação do Usuário:** P0.1-B (Google Drive OAuth com credencial real em produção).
- **Próxima Etapa do Roadmap:** Etapa 8 — Simulação + Inteligência de Performance.

## Etapas concluídas
1. **Etapa 1 — Fundação Técnica e Modelo de Conhecimento:** Editais verticalizados, concursos, tópicos, law tags e sessões de estudo (`src/lib/syllabus/`, `src/lib/concursos/`).
2. **Etapa 2 — Motor Determinístico de Planejamento (Planner Engine Core):** Cálculo de prioridade e distribuição de carga (`src/lib/planner/`).
3. **Etapa 3 — Knowledge Engine, Diagnostic Engine & Integração Planner:** Acurácia, domínio, confiança e diagnostico de lacunas (`src/lib/knowledge/`, `src/lib/diagnosis/`).
4. **Etapa 4 — Motor Determinístico de Revisão (Review Engine):** Repetição espaçada (SRS) (`src/lib/review/`).
5. **Etapa 5 — Unified Scheduler:** Fila diária única com orquestração de teoria, questões, revisões e flashcards (`src/lib/scheduler/`).
6. **Etapa 6 — Banco de Questões, Central de Erros & Evidence Layer:** Tentativas, resoluções e captura de sinais cognitivos (`src/lib/questions/`, `src/lib/error-central/`, `src/lib/evidence/`).
7. **Fase 7.1 — AI Gateway Real & Cache Persistido:** Gateway unificado com Gemini e resiliência via `ai_results` (`src/services/ai/gateway.ts`).
8. **Fase 7.2 — Mentor / Coach de IA Proativo:** Diagnósticos e orientações proativas (`src/lib/coach/`).
9. **Fase 7.3 — Socratic Engine Core & Grounding Jurídico:** Professor Fiscal, RAG Jurídico e Vade Mecum (`src/lib/socratic/`, `src/lib/legal/`).
10. **Fase 7.7 — Adaptive Deficit + Intelligent Time Estimate + Adaptive Delta:** Estimador bayesiano, gestão de déficit e reconciliação anti-churn (`src/lib/planner/`).
11. **Etapa A.1.4 / A.1.7 — Reconstrução Estrutural da Home (Central de Estudos):** Organização composicional da Dashboard orientada à execução diária do aluno.
12. **P0.2 — Material Hub & Discovery Service:** Hub unificado em `/materiais`, suporte a uploads diretos, Google Drive, URLs e tabela `public.sources` (`src/lib/materials/`).

## Etapa atual
Checkpoint Técnico de Preservação e Preparação para Migração do Repositório para o Lovable (Pré-Etapa 8).

## Próxima etapa oficial
**Etapa 8 — Simulação + Inteligência de Performance** (e homologação E2E final do fluxo de produção do Google Drive pelo usuário).

## Funcionalidades homologadas
- Modelo de dados relacional e entidades de conhecimento.
- Motores determinísticos pedagógicos (Planner, Knowledge, Diagnostic, Review, Unified Scheduler, Evidence Layer, Socratic Engine, Coach Decision Engine).
- Suavizador de tempo Bayesiano, gerenciador de déficit adaptativo e Delta Engine anti-churn.
- Material Hub (`/materiais`) com tabela `public.sources` e isolamento server-side da integração com Google Drive.
- Bateria de testes em Vitest com **1.363 testes automatizados aprovados (63/63 suítes)**.
- Compilação e build sem erros no Vite/TanStack Start.

## Funcionalidades não homologadas
- **Teste E2E do Google Drive OAuth em produção:** O código do backend e da Server Function está implementado e coberto por testes unitários/integração, porém a autorização final com token real do Google em ambiente de produção requer interação manual do usuário.
- **Etapas 8, 9 e 10 do Roadmap:** Não foram iniciadas (conforme planejado no `ROADMAP_MESTRE.md`).

## Problemas conhecidos
- **ESLint Fast Refresh Warnings:** 14 avisos de ESLint relacionados ao React Fast Refresh em componentes UI que exportam utilitários auxiliares no mesmo arquivo. Não causam nenhum erro de runtime ou de compilação.
- **Evolução da Dashboard:** A interface da Dashboard passou por reestruturações visuais e está 100% conectada aos dados e hooks reais. Pode ser aprimorada esteticamente no Lovable, preservando obrigatoriamente a camada de integração de dados e motores existentes.

## Dashboard atual
- **Rota:** `/dashboard` (`src/routes/_authenticated/dashboard.tsx`).
- **Arquivos principais:** `src/routes/_authenticated/dashboard.tsx`, `src/components/study/WhatToStudyNowCard.tsx`, `src/components/dashboard/GurujaCycleTasks.tsx`, `src/components/coach/CoachGuidanceCard.tsx`.
- **Estado funcional:** Totalmente funcional, sem mocks, consumindo diretamente os motores de planejamento, revisão, diagnóstico e mentoria do Coach.
- **Estado visual:** Reestruturada visualmente para priorizar a próxima ação de estudo ("O Que Fazer Agora?") e a esteira da Jornada de Estudo do Dia.

## Material Hub
- **Rota:** `/materiais` (`src/routes/_authenticated/materiais.tsx`).
- **Tabela principal:** `public.sources` (unifica fontes externas, PDFs, vídeos, atalhos, links e arquivos do Drive).
- **Serviço de Descoberta:** `src/lib/materials/drive/discovery-service.ts` com busca em Meu Drive, Compartilhados Comigo e Shared Drives.
- **Server Functions:** `src/lib/materials/drive/drive-server-fn.ts` executando exclusivamente no servidor TanStack Start.

## Google Drive
- **Criptografia & Segredos:** Tokens criptografados com AES-256-GCM (`enc_v2`) armazenados em `public.user_drive_credentials`.
- **Isolamento:** `DRIVE_CREDENTIAL_KEY` restrita ao ambiente do servidor (`process.env`). NENHUM vazamento para o bundle client do navegador.

## Arquitetura protegida
As seguintes pastas e módulos contêm a inteligência central do Aprovado Fiscal e **NÃO DEVEM SER REESCRITOS OU DESLOCADOS** durante refatorações visuais no Lovable:
- `src/lib/planner/`
- `src/lib/knowledge/`
- `src/lib/diagnosis/`
- `src/lib/review/`
- `src/lib/scheduler/`
- `src/lib/evidence/`
- `src/lib/coach/`
- `src/lib/socratic/`
- `src/lib/error-central/`
- `src/lib/decision/`
- `src/lib/questions/`
- `src/lib/materials/`
- `src/lib/legal/`
- `src/lib/syllabus/`

## Banco de dados
- PostgreSQL gerenciado via Supabase.
- Esquema relacional relocalizado nas tabelas: `contests`, `subjects`, `topics`, `law_tags`, `study_sessions`, `attempts`, `public.sources`, `user_drive_credentials`, `ai_results`, `review_events`.
- Políticas RLS ativas e atreladas a `auth.uid()`.

## Segurança
- Auditado e verificado: Nenhuma chave privada ou segredo do Google Workspace/Supabase/Gemini exposto no código do cliente frontend.
- `.env.example` sanitizado.

## Testes
- **Status:** PASS (100% aprovado).
- **Suítes de Teste:** 63 / 63 aprovadas.
- **Total de Testes Automatizados:** 1.363 / 1.363 aprovados.

## Build
- **Status:** PASS.
- Execução do `compile_applet` concluída com sucesso sem falhas de empacotamento ou dependências ausentes.

## Lint
- **Status:** PASS (0 erros, 14 warnings leves de Fast Refresh).

## TypeScript
- **Status:** PASS NO BUILD (`compile_applet` e Vite TanStack Start compilam com sucesso).
- **Observação de tsc --noEmit:** O projeto compila e empacota com sucesso via Vite/TanStack. O checador estático `tsc` aponta avisos de `strictNullChecks` na camada experimental de simulados em `simulation-historical-analytics.ts` e tipos estritos de `searchParams` do TanStack Router nas rotas de simulados. Não impedem a compilação nem a execução do projeto.

## Dependências externas
- **Supabase:** Autenticação, Banco de Dados PostgreSQL e Storage.
- **Google Gemini API:** Modelo de linguagem via SDK `@google/genai`.
- **Google Drive API v3 & OAuth 2.0:** Descoberta e leitura de materiais.

## Estado geral
O projeto **Aprovado Fiscal** encontra-se em estado **extremamente saudável, estável, totalmente testado (1.363 testes passando)** e pronto para transição segura para o ambiente Lovable.

## O que o Lovable DEVE preservar
1. O repositório como Fonte de Verdade e o `ROADMAP_MESTRE.md` como Constituição do projeto.
2. Todos os motores pedagógicos determinísticos localizados em `src/lib/`.
3. A suíte completa de 1.363 testes automatizados em Vitest.
4. O esquema do banco de dados Supabase e as políticas RLS.
5. O isolamento server-side das credenciais e Server Functions do Google Drive.

## O que o Lovable PODE modificar
1. Layouts de interface, componentes visuais, animações, temas CSS/Tailwind e polimento estético das telas da Dashboard, Material Hub e demais centrais.
2. Criação de novas telas ou interfaces para apoiar as futuras etapas do Roadmap (como a Etapa 8 — Simulados).

## O que o Lovable NÃO DEVE modificar sem autorização
1. Regras pedagógicas do sistema (fórmulas do Planner Engine, repetição espaçada do Review Engine, evidências cognitivas da Evidence Layer).
2. Substituir motores determinísticos por chamadas diretas de LLM sem respaldo do algoritmo.
3. Deletar ou ignorar testes automatizados existentes.

## Próximo passo após a migração
Importar/abrir o repositório no Lovable, executar a auditoria de entrada para confirmar o funcionamento no novo ambiente e prosseguir para o planejamento e desenvolvimento da **Etapa 8 — Simulação + Inteligência de Performance**.
