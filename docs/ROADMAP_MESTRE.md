# ROADMAP MESTRE OFICIAL — APROVADO FISCAL

## REGRA DE GOVERNANÇA DO ROADMAP
O ROADMAP_MESTRE.md é a referência estrutural oficial do APROVADO FISCAL. Fases e subfases podem ser detalhadas durante a implementação, mas não devem alterar a estrutura ou o objetivo das etapas principais sem decisão explícita.

---

## CADEIA CENTRAL DO PRODUTO

Princípio arquitetural fundamental do sistema:

**EDITAL**  
↓  
**CONHECIMENTO**  
↓  
**QUESTÕES**  
↓  
**ERROS**  
↓  
**DIAGNÓSTICO**  
↓  
**REVISÃO**  
↓  
**PLANEJAMENTO**  
↓  
**EXECUÇÃO**  
↓  
**MEDIÇÃO**  
↓  
**ADAPTAÇÃO**  
↓  
**PREDIÇÃO**  
↓  
**NOVA DECISÃO**  
↓  
**CICLO CONTÍNUO**  

---

## ESTRUTURA DAS ETAPAS OFICIAIS

### ETAPA 1 — FUNDAÇÃO TÉCNICA
**Objetivo:** Construir a infraestrutura-base do sistema.  
**Inclui:**
* Arquitetura e estrutura do projeto;
* Supabase (Auth, RLS, Storage);
* Perfis de usuário;
* Modelagem de dados fundamental;
* Componentes base;
* Serviços e engines essenciais;
* Tipagem e contratos TypeScript;
* Configurações de ambiente;
* Testes automatizados;
* Arquitetura modular limpa.

---

### ETAPA 1.1 — INTEGRIDADE, SEGURANÇA E ENDURECIMENTO
**Objetivo:** Garantir segurança, integridade, estabilidade e auditabilidade.  
**Inclui:**
* Segurança e isolamento RLS rígido;
* Validações determinísticas de entrada e saída;
* Tratamento e centralização de erros;
* Controle de acesso baseado em autenticação;
* Integridade referencial e idempotência de transações;
* Testes de regressão e suites de sanitização;
* Hardening de rotas e APIs;
* Auditoria arquitetural contínua.

---

### ETAPA 2 — CENTRO DE COMANDO + PLANEJAMENTO ADAPTATIVO
**Inclui:**

#### Centro de Comando
* Dashboard com visão holística do progresso;
* Acompanhamento de domínio por matéria e tópico;
* Indicadores reais de horas líquidas e questões;
* Painel de pendências e tarefas do dia;
* Alertas preventivos e sugestões;
* Distribuição de prioridades de estudo.

#### Planner (Planejador Adaptativo)
* Ciclos de estudo personalizados;
* Grade de disponibilidade semanal (minutos disponíveis);
* Alocação equilibrada de horas por matéria/tópico;
* Geração determinística de blocos de estudo e metas;
* Replanejamento dinâmico diante de imprevistos/atrasos;
* Adaptação contínua da grade sem sobrecarga.

#### Coach
* Orientação contextual e pedagógica;
* Recomendações personalizadas de foco;
* Acompanhamento do ritmo semanal;
* Priorização estratégica de conteúdo.

---

### ETAPA 3 — MOTOR DE QUESTÕES + DIAGNÓSTICO
**Inclui:**

#### Motor de Questões
* Banco de questões estruturado com metadados;
* Filtros dinâmicos (disciplina, assunto, banca, concurso, ano, tipo);
* Resolução interativa com feedback imediato;
* Rastreamento de acertos, erros e tempo líquido gasto;
* Calibração de dificuldade por desempenho.

#### Central de Erros Inteligente
* Registro automático e manual de erros cometidos;
* Classificação taxonômica do erro (lacuna teórica, pegadinha, interpretação, distração);
* Identificação de padrões de recorrência e severidade;
* Histórico evolutivo e trilha de remediação.

#### Engines de Conhecimento e Diagnóstico
* **Knowledge Engine:** Cálculo e atualização determinística do domínio (`mastery_score`) e confiança (`confidence_level`);
* **Signals Builder:** Emissão de sinais cognitivos para consumo adaptativo;
* **Diagnostic Engine:** Diagnóstico detalhado de saúde do conhecimento por tópico.

#### Integração Crítica
* Diagnóstico → Planner via `computeDiagnosticBoost` para priorização ativa no cronograma.

---

### ETAPA 4 — MOTOR DE REVISÃO ADAPTATIVA
**Inclui:**
* **Review Engine:** Algoritmo determinístico baseado na curva do esquecimento (Ebbinghaus / SRS adaptativo);
* **Review Service & Types:** Contratos e persistência da fila de revisão;
* Rastreamento de `next_review_at`, `last_review_at` e `last_review_result`;
* Registro de histórico em `review_events`;
* Priorização adaptativa da fila de revisões por urgência e retenção;
* Balanceamento da proporção entre revisão e conteúdo novo na grade diária.

---

### ETAPA 5 — INTELIGÊNCIA PEDAGÓGICA ADAPTATIVA
**Integra:**
* Domínio e nível de confiança;
* Histórico e severidade de erros;
* Desempenho e velocidade em questões;
* Diagnóstico de vulnerabilidades por tópico;
* Fila de revisões adaptativas pendentes;
* Incidência histórica e peso no edital;
* Dificuldade percebida e esforço despendido;
* Tempo acumulado e evolução temporal.

**Objetivo:** Calcular a prioridade pedagógica global e balancear tarefas unificadas (estudo novo + revisão + remediação) de forma determinística e adaptativa.

---

### ETAPA 6 — INTELIGÊNCIA DE EDITAL + ESTRATÉGIA DE PROVA
**Inclui:**
* Mapeamento completo e hierárquico do edital (disciplinas, tópicos, subtópicos);
* Atribuição de pesos e relevância por matéria;
* Análise de incidência estatística por banca examinadora;
* Inteligência de histórico e padrões de cobrança de bancas (FGV, Cebraspe, FCC, etc.);
* Estratégia de fechamento de edital por custo-benefício;
* Otimização do retorno cognitivo por hora estudada (ROI pedagógico).

---

### ETAPA 7 — COACH AUTÔNOMO + SISTEMA DE DECISÃO
**Acompanhamento Contínuo:**
* Desempenho, taxa de acertos e consistência;
* Níveis de domínio e vulnerabilidades ativas;
* Erros pendentes e reincidentes;
* Fila e atrasos em revisões adaptativas;
* Horas líquidas cumpridas versus disponibilidade cadastrada;
* Aderência ao plano e desvios de ritmo;
* Trajetória de retenção e risco de esquecimento;
* Proximidade da data da prova / pós-edital.

**Capacidade Decisória:**
* Recomendar estudo novo, revisão espaçada ou remediação socrática;
* Ajustar carga horária e redistribuir backlog de tarefas;
* Recuperar atrasos com realocação inteligente de disponibilidade;
* Alterar prioridades com base em fraquezas diagnósticas;
* Prescrever baterias de questões direcionadas;
* Reforçar assuntos críticos com artefatos cognitivos e fundamentação jurídica RAG;
* Orientar o aluno no ciclo contínuo:
  **Aluno executa → sistema mede → sistema interpreta → sistema decide → planner adapta.**

---

### ETAPA 8 — SIMULAÇÃO + INTELIGÊNCIA DE PERFORMANCE
**Inclui:**
* Gestão e execução de simulados e provas completas;
* Simulados personalizados e direcionados por vulnerabilidade;
* Análise aprofundada de nota bruta, líquida e percentil;
* Gestão de tempo de prova e ritmo por questão/disciplina;
* Análise de questões em branco, chutes e pegadinhas;
* Estratégia de prova, resistência mental e consistência emocional;
* Relatórios pós-simulado com plano de ataque corretivo.

---

### ETAPA 9 — INTELIGÊNCIA PREDITIVA + OTIMIZAÇÃO PARA APROVAÇÃO
**Inclui:**
* Modelos preditivos de evolução de notas e domínio até o dia da prova;
* Previsão probabilística de desempenho por disciplina e banca;
* Estimativa de risco de reprovação e pontos de corte projetados;
* Simulação de cenários e ajuste de metas para aprovação;
* Otimização global da carga horária para maximização do ROI cognitivo por hora.

---

### ETAPA 10 — ECOSSISTEMA APROVADO FISCAL
**Inclui:**
* Expansão para múltiplos concursos e carreiras da área fiscal e controle;
* Ingestão multimodal de materiais (PDFs, videoaulas, YouTube, Google Drive);
* Geração inteligente de materiais e recursos de apoio (flashcards, mapas mentais, resumos esquematizados);
* Hub integrado unificando Dashboard, Coach, Planner, Questões, Revisões, Central de Erros, Simulados e Métricas;
* Observabilidade completa do ciclo de aprendizagem e dashboards de alta precisão.

---

## ESTADO DE AUDITORIA PERMANENTE
Este documento foi registrado no repositório como baseline oficial em 31/08/2026. Todas as auditorias e implementações técnicas futuras devem referenciar as etapas e princípios aqui definidos.
