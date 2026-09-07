<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# APROVADO FISCAL — GOVERNANÇA PERMANENTE DO PROJETO

## REGRA DE OURO E CONTINUIDADE DO PROJETO
Antes de qualquer modificação, implementação ou decisão arquitetural no Aprovado Fiscal, o assistente DEVE obrigatoriamente consultar os seguintes documentos de governança em `/docs/`:
1. `docs/ROADMAP_MESTRE.md` — A Constituição oficial do projeto.
2. `docs/ESTADO_ATUAL.md` — Registro vivo de homologações, bloqueios e próximos passos.

## DIRETRIZES PERMANENTES DE EXECUÇÃO
- **ROADMAP É INVIOLÁVEL:** Nunca reordenar, alterar, substituir ou renomear etapas do `ROADMAP_MESTRE.md` sem autorização explícita do responsável pelo projeto.
- **UTILIZAÇÃO RÁPIDA (TRANSVERSAL):** A prioridade transversal é tornar o sistema utilizável o mais rápido possível sem comprometer a arquitetura ou criar MVPs pobres.
- **SISTEMA OPERACIONAL DE ESTUDOS:** Preservar a visão do sistema como um cérebro pedagógico autônomo. O aluno entra para responder: *"O que eu faço agora?"*.
- **REUTILIZAÇÃO DE ENGINES:** Nunca criar engines, serviços ou tabelas duplicadas se a capacidade já existir no projeto (Planner, Knowledge, Diagnostic, Review, Evidence, Coach, Socratic, Scheduler).
- **RIGOR DE HOMOLOGAÇÃO:** Funcionalidades só são consideradas "Homologadas" após verificação e comprovação de evidências reais.
- **ISOLAMENTO SERVER-SIDE:** Criptografia, segredos (`DRIVE_CREDENTIAL_KEY`, `service_role`) e SDKs de servidor (`node:crypto`) devem permanecer 100% isolados em Server Functions (`createServerFn`), jamais vazando para o bundle client do navegador.

