# ESTADO ATUAL DO PROJETO — APROVADO FISCAL V2
*Documento de Controle e Registro Contínuo do Estado Real de Implementação, Homologação e Próximos Passos*

---

## 1. POSICIONAMENTO ATUAL

* **Etapa Atual:** BLOCO A.1 Refinamento UX/UI do Dashboard Concluído com Sucesso | P0.2 Implementada & Testada
* **Próxima Prioridade:** Avanço para P0.3 — Mnemônicos & Fórmulas (Engine de Mnemônicos + Associação a LawTags/Fórmulas) do ROADMAP_MESTRE.md.
* **Linha de Governança:** Conforme estabelecido na **Governança Permanente do Projeto**, o `ROADMAP_MESTRE.md` permanece inalterado. A estratégia de uso rápido é uma camada de execução transversal para tornar as capacidades existentes imediatamente funcionais e fluidas para o aluno.

---

## 2. MATRIZ DE STATUS DE HOMOLOGAÇÃO

### 🟢 HOMOLOGADOS E ESTÁVEIS
* **Etapa 1 — Fundação Técnica e Modelo de Conhecimento:** Tabelas de syllabus, law tags, sessões de estudo.
* **Etapa 2 — Motor Determinístico de Planejamento (Planner Engine Core):** Algoritmo de cálculo de prioridade e distribuição Round-Robin.
* **Etapa 3 — Knowledge Engine, Diagnostic Engine & Integração Planner:** Acurácia, domínio, confiança e diagnostico de lacunas.
* **Etapa 4 — Motor Determinístico de Revisão (Review Engine):** Algoritmo de repetição espaçada (SRS).
* **Etapa 5 — Unified Scheduler:** Orquestração integrada de fila de tarefas diárias.
* **Etapa 6 — Banco de Questões, Central de Erros & Evidence Layer:** Resolução, tentativas e registro de sinais cognitivos.
* **Fase 7.1 — AI Gateway Real & Cache Persistido:** Resiliência de requisições com Gemini via `ai_results`.
* **Fase 7.2 — Mentor / Coach de IA Proativo:** Diagnósticos proativos e orientações contextuais.
* **Fase 7.3 — Socratic Engine Core & Grounding Jurídico:** RAG Jurídico e Professor Fiscal.
* **BLOCO A & BLOCO A.1 — Refinamento UX/UI, Command Center & Layout Operational:**
  - Design System com paleta `oklch` de alta legibilidade, tipografia hierárquica e componentes premium.
  - Card Hero "O Que Fazer Agora?" com 4 zonas nítidas (Contexto, Motivo Pedagógico, Material Recomendado com link direto, e CTA dominante).
  - Unificação do Coach APROVADO FISCAL como mentor único sem banners concorrentes.
  - Navegação do AppShell simplificada em 5 grupos claros (ESTUDO, EDITAL, TREINO, INTELIGÊNCIA, SISTEMA) e responsividade mobile aprimorada.

---

## 3. STATUS DA ETAPA P0.1-B E P0.2 (GOOGLE DRIVE + MATERIAL HUB + DISCOVERY)

* **P0.1-B Google Drive OAuth:** 🟡 **IMPLEMENTAÇÃO CONCLUÍDA — E2E PENDENTE**
  - Isolamento server-side com AES-256-GCM (`enc_v2`) em `public.user_drive_credentials`.
  - Zero segredos no bundle do cliente.

* **P0.2 Material Hub & Drive Discovery:** 🟢 **IMPLEMENTADO E TESTADO**
  - **Rota `/materiais` (Material Hub):** Interface unificada para Uploads Diretos, Google Drive, URLs, YouTube, Legislação e Livros.
  - **Tabela Oficial `public.sources`:** Entidade única de dados para todos os materiais.
  - **Discovery Service Layer (`discovery-service.ts`):** Suporte a "Meu Drive", "Compartilhados Comigo", "Shared Drives" e "Atalhos" com deduplicação por `user_id` e `driveFileId`.
  - **Server Functions (`drive-server-fn.ts`):** `serverDiscoverDriveFiles` e `serverImportDriveFile` isoladas no servidor via TanStack Start.
  - **Validação de Testes & Build:**
    - **1.360/1.360 testes aprovados** (63 suítes de teste).
    - **`npm run lint`** 0 erros.
    - **`compile_applet`** PASS.
    - **Auditoria de segurança de bundle** PASS (0 vazamentos).

---

## 4. PRÓXIMOS PASSOS IMEDIATOS

1. **Homologação Final do P0.1-B pelo Usuário:** Executar o teste real do fluxo de conexão com o Google Drive na interface de Configurações.
2. **P0.2 — Drive Discovery Automático por Metadados:** Implementar a localização e associação automática de arquivos do Google Drive aos tópicos do edital, mantendo o princípio de que *"o material adapta-se ao plano"*.
3. **Sprint Transversal de Utilização Rápida:**
   - **Dashboard & "O Que Fazer Agora?":** Refinar a experiência visual (referência de clareza do Guruja) para apresentar a próxima ação imediata de estudo com clareza cristalina (O que estudar, material, tempo, motivo, próxima ação).
   - **Hub de Materiais & Integrações:** Unificar visualização de fontes externas, uploads e Google Drive.
   - **Exatas (Matemática Visual):** Integração pedagógica para explicação conceitual visual e tutor socrático no erro de disciplinas exatas.
   - **Integração Fluida do Ciclo Cognitivo:** Garantir a jornada contínua do aluno de ponta a ponta sem atritos ou navegação confusa.

---

## 5. REGRAS PERMANENTES DE CONDUTA
1. **NÃO alterar o `ROADMAP_MESTRE.md`** sem autorização explícita.
2. **NÃO criar engines ou tabelas duplicadas** quando a capacidade já existir no código.
3. **NÃO declarar etapas como "Homologadas"** sem comprovação objetiva e evidências reais.
4. **Preservar a fronteira Client/Server** (Acesso a segredos e criptografia estritamente server-side).
