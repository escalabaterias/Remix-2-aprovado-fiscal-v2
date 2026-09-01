# ROADMAP MESTRE OFICIAL — APROVADO FISCAL

## REGRA DE GOVERNANÇA E FONTE DE VERDADE DO PRODUTO

O `ROADMAP_MESTRE.md` é a **ÚNICA FONTE OFICIAL DE VERDADE DO PLANEJAMENTO DO PROJETO APROVADO FISCAL**.

Ele deve ser tratado como o documento de governança suprema da arquitetura e do produto. Nenhum agente, auditoria ou refatoração futura deve:
* Ignorar decisões aqui registradas;
* Criar roadmaps paralelos ou concorrentes;
* Substituir suas decisões sem justificativa formal;
* Remover requisitos estratégicos ou simplificar capacidades para facilitar a implementação pontual de uma etapa;
* Reinterpretar a visão de produto de forma incompatível;
* Considerar qualquer etapa como concluída apenas pela existência parcial de código (exige validação por testes, build e RLS).

Documentos técnicos específicos de etapas (ex: `/docs/ETAPA_8_ARQUITETURA.md`) são rigorosamente subordinados ao Roadmap Mestre.

---

## PRINCÍPIO CENTRAL E VISÃO DO PRODUTO

O **APROVADO FISCAL** não é um mero organizador de estudos, banco de questões ou aplicativo de flashcards.

> **VISÃO CORE:** O objetivo final é construir um **SISTEMA DE INTELIGÊNCIA DE APROVAÇÃO**, capaz de cruzar continuamente dados do aluno com dados históricos de concursos, bancas examinadoras, provas anteriores, editais, disciplinas, tópicos, legislações e questões para determinar, de forma adaptativa e determinística, o que o aluno deve estudar, revisar, praticar e aprofundar para maximizar sua probabilidade de aprovação em carreiras fiscais e de controle.

O sistema busca responder continuamente a seguinte pergunta fundamental:

> **"Considerando o meu desempenho atual + o histórico das bancas + o edital + a incidência histórica + meus erros + meu domínio + meu tempo disponível + meu histórico de aprendizagem, qual é a melhor coisa que eu deveria fazer agora para aumentar minhas chances de aprovação?"**

---

## CADEIA CENTRAL DEFINITIVA DE INTELIGÊNCIA DE APROVAÇÃO

```text
FONTES REAIS
 (Questões + Editais + Legislação + Provas Anteriores)
                        ↓
             INCIDÊNCIA / BANCA DNA
                        ↓
                 DADOS DO ALUNO
                        ↓
                 KNOWLEDGE ENGINE
                        ↓
                 DIAGNOSIS ENGINE
                        ↓
                 ANALYTICS ENGINE
                        ↓
                 DECISION ENGINE
                        ↓
     COACH / SOCRATIC / COGNITIVE ARTIFACTS
                        ↓
       ESTUDO / QUESTÕES / REVISÃO / SIMULADOS
                        ↓
                  EVIDENCE LAYER
                        ↓
            ATUALIZAÇÃO DO PERFIL DO ALUNO
                        ↓
                   NOVA DECISÃO
                        ↓
                  CICLO CONTÍNUO
```

---

## CAPACIDADES ESTRUTURAIS PERMANENTES DO APROVADO FISCAL

Estas capacidades **NÃO SÃO IDEIAS OPCIONAIS**. Elas constituem o DNA permanente do APROVADO FISCAL e são requisitos estratégicos obrigatórios distribuídos pelas etapas do produto.

### 1. MOTOR DE INTELIGÊNCIA DE BANCA, EDITAL E INCIDÊNCIA (INTELLIGENCE / CROSS-DOMAIN APPROVAL ENGINE)
Motor transversal responsável por cruzar:
`CONCURSOS × BANCAS × PROVAS ANTERIORES × EDITAIS × DISCIPLINAS × TÓPICOS × SUBTÓPICOS × QUESTÕES × LEGISLAÇÕES × ARTIGOS × INCIDÊNCIA HISTÓRICA × DESEMPENHO INDIVIDUAL × ESTRATÉGIA DE ESTUDO`.

* **Geração de Inteligência Real:** Produz afirmações estatísticas derivadas de dados reais (ex: *"A banca X cobrou este assunto em 87% das provas analisadas"*, *"Dentro deste tópico, os subassuntos A, B e C concentram a maior incidência"*, *"Você possui domínio baixo no subassunto A, que possui alto peso + alta incidência; portanto, A recebe prioridade máxima"*).
* **REGRA CRÍTICA DE VERACIDADE E SEGURANÇA:** A IA **NUNCA** pode inventar estatísticas. Toda afirmação de incidência deve indicar sua origem, conjunto de provas analisado, período, banca, concurso, disciplina e tópico. Quando a amostra for reduzida, o sistema deve sinalizar a incerteza explicitamente.

### 2. DNA DAS BANCAS (BANCA DNA)
Mapeamento profundo do padrão de atuação de cada banca examinadora (FGV, Cebraspe, FCC, Vunesp, etc.), cobrindo:
* Assuntos e subtópicos mais cobrados;
* Legislação e artigos com maior incidência;
* Nível de dificuldade médio e estilo de enunciados;
* Padrões de pegadinhas e pegadas conceituais;
* Preferência por jurisprudência vs. letra da lei;
* Evolução histórica das exigências.
* **Alimentação:** O Banca DNA nutre diretamente o Planner, Diagnosis, Review Engine, Question Engine, Simulados, Coach, Analytics e Prediction Engine.

### 3. VADE MECUM INTELIGENTE + BANCO DE LEIS COM INTELIGÊNCIA DE INCIDÊNCIA
Camada especializada de estudo e exploração da legislação jurídica e tributária:
* **Mapeamento:** `LEI → ARTIGO → TÓPICO DO EDITAL → QUESTÕES → BANCA → CONCURSO → ANO → FREQUÊNCIA → PADRÃO DE COBRANÇA → DESEMPENHO → REVISÃO`.
* **Dispositivos Críticos:** Destaque automático dos artigos com maior recorrência histórica nas bancas do concurso alvo.
* **Questões & Bancas Relacionadas:** Conexão direta entre o dispositivo legal e as questões reais onde foi cobrado.
* **Prioridade Personalizada:** Cálculo da importância individual baseado na fórmula:  
  `INCIDÊNCIA HISTÓRICA + RELEVÂNCIA NO EDITAL + DESEMPENHO DO ALUNO + RECORRÊNCIA DE ERROS`.
* **Gerador de Flashcards Rastreáveis:** Possibilidade de criar flashcards fiéis à letra da lei com 1 clique, preservando a rastreabilidade da fonte legal.
* **Segurança Jurídica:** A IA interpreta e explica fontes confiáveis; jamais possui autoridade exclusiva nem inventa artigos, parágrafos, incisos, leis ou súmulas.

### 4. DÚVIDAS RECORRENTES & CONTEXTUALIZAÇÃO INTELIGENTE (CONTEXTUAL LEARNING)
Remediação profunda para erros reincidentes e conceitos de baixa retenção:
* **Trilha de Compreensão Progressiva:**  
  `CONCEITO → EXPLICAÇÃO SIMPLES → EXEMPLO PRÁTICO → CASO CONCRETO → SITUAÇÃO DO DIA A DIA → APLICAÇÃO EM PROVA → QUESTÃO → RECUPERAÇÃO ATIVA`.
* Transforma abstrações jurídicas/fiscais em situações reais de empresas ou rotinas tributárias para assegurar apreensão conceitual definitiva. Dúvidas recorrentes sobre o mesmo conceito alimentam automaticamente o diagnóstico pedagógico.

### 5. MNEMÔNICOS INTELIGENTES
Geração adaptativa de mnemônicos contextualizados para legislação, listas, classificações, exceções, fórmulas e sequências. O sistema mede posteriormente se determinado mnemônico resultou em aumento real da retenção do aluno após 7, 14 e 30 dias.

### 6. COACH AUTÔNOMO — MOTOR AUTÔNOMO DE DIAGNÓSTICO, ENSINO E DECISÃO PEDAGÓGICA
O Coach do APROVADO FISCAL **NÃO É UM CHATBOT GENÉRICO**. É um motor autônomo de decisão pedagógica e ensino.
* **Análise Contínua:** Avalia taxa de acertos, domínio por tópico, reincidência de erros, tempo por questão, retenção, backlog de revisões, metas cumpridas, incidência da banca e proximidade da prova.
* **Atuação como Professor Adaptativo:** Prescreve o que, por que, como e por quanto tempo estudar. Quando o aluno não entende um conceito, o Coach não desiste:  
  `Explicação Direta → Explicação Simplificada → Analogia → Caso Concreto → Decomposição em Etapas → Representação Visual / Esquema / Tabela`.
* **Modo Socrático Preservado:** Alterna entre orientação direta e condução socrática (`PERGUNTA → TENTATIVA → PISTA → NOVA TENTATIVA → FEEDBACK → CONSOLIDAÇÃO → EVIDÊNCIA`) para reforçar a recuperação ativa.

### 7. ENSINO ADAPTATIVO MULTIMODAL
Se o aluno não entendeu de uma forma, o sistema deve tentar obrigatoriamente outra abordagem. A meta não é apenas responder a dúvidas, mas produzir compreensão real através de múltiplos formatos pedagógicos (tabelas comparativas, mapas conceituais, passos a passo, questões comentadas e exemplos práticos).

### 8. EXPERIMENTAÇÃO DE MÉTODOS DE REVISÃO (MOTOR DE EXPERIMENTAÇÃO PEDAGÓGICA)
O sistema testa empiricamente diferentes estratégias (leitura de resumo, resolução de questões, recuperação socrática, flashcards, mnemônicos, mapas mentais, casos práticos) para identificar:  
**"Qual método de estudo/revisão funciona melhor para ESTE aluno, neste tópico específico, neste momento?"**

### 9. ATENÇÃO E TRATAMENTO ESPECIAL PARA DISCIPLINAS DE EXATAS
Tratamento arquitetural dedicado para disciplinas de alta densidade quantitativa (Raciocínio Lógico-Matemático, Estatística, Matemática Financeira, Contabilidade Avançada):
* Diagnóstico de pré-requisitos não consolidados;
* Raciocínio passo a passo detalhado e identificação de erros de procedimento vs. erro conceitual;
* Prática deliberada e progressão gradativa de dificuldade com suporte conceitual visual/desenhado pelo Coach;
* Ajuste de carga horária baseado em evidência real de domínio, e não apenas em regras fixas.

### 10. MÉTRICAS EXPLICÁVEIS & TRANSPARÊNCIA UX
Todo indicador, percentual, score de domínio ou métrica de probabilidade apresentado na UI deve possuir explicação pedagógica e metodológica acessível via hover (desktop) ou toque (mobile):
* O que o percentual representa;
* Como foi calculado e quais dados foram considerados;
* Como interpretá-lo e qual ação prática o aluno deve tomar.

---

## MAPEAMENTO DAS CAPACIDADES NAS 10 ETAPAS OFICIAIS

Nenhuma capacidade descrita exige uma "Etapa 11". Todas estão distribuídas nas 10 etapas oficiais do produto:

### ETAPA 1 — FUNDAÇÃO TÉCNICA E INFRAESTRUTURA
* Architecture, Supabase (Auth, RLS, Storage), data modeling, base components, TypeScript types/contracts.
* **ETAPA 1.1 — INTEGRIDADE, SEGURANÇA E ENDURECIMENTO:** RLS rígido, validações determinísticas, tratamento central de erros, testes de regressão, hardening de APIs.

### ETAPA 2 — CENTRO DE COMANDO + PLANEJAMENTO ADAPTATIVO
* **Centro de Comando:** Dashboard holístico, domínio por matéria/tópico, horas líquidas, tarefas diárias, alertas.
* **Planner Adaptativo:** Ciclos de estudo, disponibilidade semanal, geração determinística de blocos, replanejamento dinâmico diante de atrasos.
* **Coach:** Orientação contextual, recomendações de foco e priorização estratégica.

### ETAPA 3 — MOTOR DE QUESTÕES + DIAGNÓSTICO
* **Motor de Questões:** Banco de questões estruturado, filtros dinâmicos, resolução interativa, taxa de acerto e tempo.
* **Central de Erros Inteligente:** Registro automático/manual, taxonomia de erros (lacuna teórica, pegadinha, interpretação, distração), severidade e trilha de remediação.
* **Engines de Conhecimento e Diagnóstico:** Knowledge Engine (`mastery_score`, `confidence_level`), Signals Builder e Diagnostic Engine (`computeDiagnosticBoost`).

### ETAPA 4 — MOTOR DE REVISÃO ADAPTATIVA
* **Review Engine:** Algoritmo determinístico baseado na curva do esquecimento (Ebbinghaus / SRS adaptativo).
* Rastreamento de `next_review_at`, `last_review_at`, `last_review_result` e eventos `review_events`.
* Priorização adaptativa e balanceamento diário de revisões vs. conteúdo novo.

### ETAPA 5 — INTELIGÊNCIA PEDAGÓGICA ADAPTATIVA
* Unificação de domínio, confiança, severidade de erros, velocidade, diagnósticos, revisões pendentes, peso no edital e incidência da banca.
* Cálculo determinístico da prioridade pedagógica global e balanceamento de tarefas (estudo + revisão + remediação).

### ETAPA 6 — INTELIGÊNCIA DE EDITAL + ESTRATÉGIA DE PROVA
* Mapeamento hierárquico de edital (disciplinas, tópicos, subtópicos), pesos e relevância.
* Análise de incidência estatística por banca examinadora, Banca DNA, custo-benefício e ROI pedagógico por hora estudada.
* Base de evidências de questões, editais, Legislação e Vade Mecum Inteligente.

### ETAPA 7 — COACH AUTÔNOMO + SISTEMA DE DECISÃO
* Decision Engine, Coach Autônomo, Coach Socrático, Artefatos Cognitivos, Ciclo Cognitivo de Aprendizagem e Analytics.
* Acompanhamento contínuo de desempenho, prescrição adaptativa de estudos, alteração de prioridades, remediação socrática, contextualização de dúvidas e mnemônicos.

### ETAPA 8 — SIMULAÇÃO + INTELIGÊNCIA DE PERFORMANCE
* **Subfase 8.1 CONCLUÍDA E VALIDADA:** Modelagem de dados (`exam_templates`, `exam_sessions`, `exam_session_answers`, `exam_session_events`), RLS, constraints, tipos e schemas Zod.
* **Subfases 8.2 a 8.9 (NÃO INICIADAS):** Geração e distribuição de provas, scoring engine, cronômetro auditável, analytics, integração cognitiva, hub/construtor, ambiente de prova e pós-prova.

### ETAPA 9 — INTELIGÊNCIA PREDITIVA + OTIMIZAÇÃO PARA APROVAÇÃO
* Modelos preditivos de evolução de notas, previsão probabilística de desempenho por banca/disciplina, estimativa de nota de corte, simulação de cenários de aprovação, Motor de Experimentação de Métodos de Estudo/Revisão e otimização global da carga horária.

### ETAPA 10 — ECOSSISTEMA APROVADO FISCAL
* Expansão para múltiplos concursos/carreiras fiscais e de controle, ingestão multimodal de materiais (PDFs, vídeos), geração de materiais sintéticos (flashcards, mapas mentais), Vade Mecum Inteligente ampliado, Hub integrado e escala do produto.

---

## MATRIZ DE ESTADO OFICIAL DO PROJETO

| Etapa / Subfase | Descrição / Foco | Estado Oficial |
| :--- | :--- | :--- |
| **Etapa 1** | Fundação Técnica & Infraestrutura | 🟢 CONCLUÍDA |
| **Etapa 1.1** | Endurecimento & Segurança | 🟢 CONCLUÍDA |
| **Etapa 2** | Centro de Comando + Planner Adaptativo | 🟢 CONCLUÍDA |
| **Etapa 3** | Motor de Questões + Diagnóstico + Central de Erros | 🟢 CONCLUÍDA |
| **Etapa 4** | Motor de Revisão Adaptativa | 🟢 CONCLUÍDA |
| **Etapa 5** | Inteligência Pedagógica Adaptativa + Unified Scheduler | 🟢 CONCLUÍDA |
| **Etapa 6** | Inteligência de Edital + Evidências Reais | 🟢 CONCLUÍDA |
| **Etapa 7** | Coach Autônomo + Sistema de Decisão + Ciclo Cognitivo | 🟢 CONCLUÍDA |
| **Etapa 8.1** | Modelagem de Dados & Tipos Contratuais de Simulados | 🟢 CONCLUÍDA E VALIDADA |
| **Etapa 8.2** | Motor de Geração e Distribuição de Provas | 🔴 NÃO INICIADA |
| **Etapas 8.3 – 8.9** | Pontuação, Cronômetro, Analytics, UI Simulados | 🔴 NÃO INICIADAS |
| **Etapa 9** | Inteligência Preditiva & Otimização de Aprovação | 🔴 NÃO INICIADA |
| **Etapa 10** | Ecossistema Aprovado Fiscal Multimodal | 🔴 NÃO INICIADA |

---

## REGRA ABSOLUTA DE GOVERNANÇA E PRESERVAÇÃO

> **Nenhuma futura implementação pode remover, simplificar ou ignorar essas capacidades apenas porque a implementação imediata de uma etapa não necessita delas.**

Elas constituem a especificação estratégica permanente do APROVADO FISCAL. Uma etapa pode implementar uma fração do banco ou da interface, mas a arquitetura deve ser sempre projetada preservando a evolução completa do sistema.

---

## REGISTRO DE HISTÓRICO DE AUDITORIA

* **Data da Última Auditoria:** 31/08/2026
* **Testes Validados:** 1.271 / 1.271 aprovados (57 suítes de teste).
* **Build:** Aprovado (`compile_applet` verde).
* **Migration 8.1:** `20260831150000_etapa8_1_simulados_domain.sql` criada e validada.
* **Próxima Ação Autorizada:** Aguardar permissão explícita para início da Etapa 8.2.
