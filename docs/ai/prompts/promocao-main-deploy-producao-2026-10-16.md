# SGP+ — Auditoria de liberação, promoção para main e deploy em produção

**TASK_ID:** `promocao-main-deploy-producao-2026-10-16`
**Repositório:** `multivacia/sgp`
**Destino:** produção HostGator via `main`
**Prioridade:** integridade funcional e de dados; não ampliar escopo.

## Autorização e limite do escopo

O usuário solicitou preparar ou realizar a promoção à `main` e deploy em produção após **homologar especificamente a busca `OS & Atividade` no Kiosk**, integrada via PR #37. Essa homologação NÃO equivale a uma declaração de que todas as demais mudanças da `develop` foram aceitas. **Não interprete o pedido de deploy como autorização para publicar silenciosamente outras mudanças funcionais não homologadas.**

A busca está implementada na `develop` tanto na caixa **Buscar atividade…** quanto em **Outra atividade**, preservando a apresentação do resultado. As demais PRs abertas (backup/restore, data sugerida no planejamento, redesign de carrossel, resumo de capacidade, eficiência, sessão etc.) não devem entrar.

**Regra de parada obrigatória:** não faça push em `main`, workflow_dispatch, deploy nem alteração de produção enquanto não estiver comprovado que o *pacote efetivo* a ser publicado foi homologado. Se só estiver homologada a busca do Kiosk e uma promoção integral da `develop` incluir outras funcionalidades, **PARE na auditoria** e devolva o inventário de pendências. Não use interpretação implícita para contornar esse gate. Se uma publicação isolada da busca exigir portar funcionalidades não aprovadas da `develop`, **PARE**, sem fazer backport oportunista.

## Estado conhecido — reconfirmar antes de agir

Consulta de 16/10/2026:

- `origin/main`: `c611d10feacf329bdc217fe391ebf47a90a6ea7a` (versão `1.9.8`).
- `origin/develop`: `247b698589edf78d90f01461b264821f143ccd5a` (versão declarada `1.9.9`).
- `origin/homol`: `6b768c852a18b7428e3dadf761bad7e35c1d61ef`.
- PR #37, pesquisa Kiosk `OS & Atividade`, integrada em `develop`; CI `verify` verde.
- `main...develop`: **67 commits e 269 arquivos alterados**, incluindo alterações relevantes em frontend e backend. **Nenhum arquivo `server/migrations/` difere entre `main` e `develop`**, mas isso não prova que o banco de produção esteja sincronizado.
- O próprio código de pesquisa depende de componentes presentes na `develop` mas ainda ausentes na `main` (por exemplo `server/src/shared/accentInsensitiveSearch.ts`). Não presumir que um cherry-pick simples seja independente.

## Governança inicial

1. Ler integralmente, nesta ordem, `AGENTS.md`, `CLAUDE.md`, `docs/ai/context/PROJECT_CONTEXT.md`, `docs/ai/context/SESSION_CHECKPOINT.md` e o workflow `.github/workflows/deploy-hostgator-vps.yml` do repositório atual.
2. Consultar `docs/ai/returns/kiosk-busca-os-atividade-retorno.md` e o diff da PR #37. Verificar a decisão humana de homologação.
3. Executar `git fetch origin --prune`, `git status --short`, `git branch -avv`, `git rev-parse origin/main`, `git rev-parse origin/develop`, `git rev-parse origin/homol` e `git merge-base --is-ancestor origin/main origin/develop`.
4. Não usar `reset --hard`, `clean`, `stash`, `force-push`, rebase ou substituição de histórico no checkout de trabalho. Se houver arquivos locais modificados, não destruí-los; use um worktree limpo e isolado para auditoria.
5. Não mexer em `main`, `homol`, `server/migrations/`, secrets, Nginx, PM2, cron, VPS, produção ou banco antes dos gates a seguir.

## Fase A — auditar a liberação (somente leitura; obrigatória)

1. Inventariar `git log --oneline origin/main..origin/develop`, `git diff --stat origin/main..origin/develop`, `git diff --name-status origin/main..origin/develop` e o diff integral dos arquivos de negócio alterados.
2. Separar por funcionalidade: alterações da Tati (filtros, planejamento, exportação IA, PDFs, Extra Esteira, justificativas, dashboard), regra de apontamento apenas em atividades planejadas (web, Kiosk e gestor), atualizações dos manuais e Guias Práticos, textos pt-BR, menu Ajuda, pesquisa `OS & Atividade` e demais itens. Apontar exatamente o que está na `develop`, mas não tem aceitação humana documentada.
3. Listar os commits exclusivos da `develop` que não pertencem à pesquisa aprovada; descrever impacto sobre produção. Confirmar que nenhuma PR aberta foi embutida inadvertidamente.
4. Verificar migrations em `main`, `develop` e o histórico **realmente aplicado** no banco de produção (somente leitura). Não deduzir o estado do banco a partir de arquivos SQL.
5. Verificar CI `verify` da ponta atual da `develop`; executar em worktree limpo os comandos de build, typecheck, testes de integração pertinentes e testes de regressão. Documentar falhas preexistentes separadamente das novas, com saídas reais e exit codes. Não desabilitar nem maquiar testes.
6. Conferir os metadados de release: `app-version.json` em `main` (`1.9.8`) e `develop` (`1.9.9`). A descrição da `1.9.9` pode não refletir todas as mudanças funcionais; **não editar versão nem releaseName sem autorização**. Reportar incoerências.
7. **Gate de aceite:** só continuar se houver evidência explícita de homologação de TODOS os itens funcionais incluídos no pacote. O único aceite novo informado neste pedido é a pesquisa do Kiosk. Se faltarem aceites, **PARAR** e devolver uma tabela `funcionalidade | evidência de aceite | risco | decisão pendente`. Não promover nada.
8. Se o objetivo for publicar somente a pesquisa do Kiosk, verificar se é possível uma liberação isolada sem importar regras de negócio não homologadas. Não criar backport nem branch de release com novas regras sem autorização específica. Se não for possível, parar e apontar dependências exatas.

## Fase B — pré-deploy, somente após aprovação do escopo integral

1. Confirmar que o fluxo `develop → homol → main` foi cumprido ou que houve exceção expressamente aprovada e documentada para esta publicação. Não alterar `homol` por conta própria.
2. Verificar acesso efetivo à VPS HostGator (não presumir): aplicação em `/opt/sgp/sgp-main`, frontend `/var/www/sgp-web`, PM2 `sgp-api`, banco `sgp_prod` no PostgreSQL 18 porta 5433, health `https://sgp.multivacia.com/api/v1/health`, SSH usuário `deploy` e porta 22022 segundo a documentação histórica. Confirmar valores atuais no ambiente sem expor segredos.
3. **Backup de banco obrigatório antes do push:** auditar `crontab -l`, `/opt/sgp/backup-sgp.sh`, `/opt/sgp/backups/local` e a hora/validade do último dump. Produzir ou comprovar backup pré-release de `sgp_prod`, formato custom `pg_dump -Fc`, com arquivo íntegro validado por `pg_restore --list`, checksum SHA-256 e caminho real documentado. Não substituir isso por backup só do frontend. Não restaurar nem manipular dados sem autorização independente.
4. Verificar `git status --short` no repositório de produção; o workflow faz `git reset --hard origin/main`, portanto **PARAR** se houver mudança local importante a preservar. Verificar espaço livre, configuração de build e funcionamento do PM2 e health antes do deploy.
5. Registrar rollback: SHA da `main` antes da promoção, backup PostgreSQL validado, cópia do frontend anterior e modo de reverter aplicação por **novo commit** que reverta a release (nunca force-push). Restaurar banco só sob decisão humana específica.
6. Confirmar novamente que a `develop` não avançou durante a auditoria. Se avançou, recomeçar a análise do delta e do aceite.

## Fase C — promoção e publicação, somente se TODOS os gates anteriores passaram

1. Confirmar `origin/main` ancestral de `origin/develop`. Preferir promoção estritamente **fast-forward**, sem squash, rebase ou force-push, em checkout/worktree limpo:

   ```bash
   git fetch origin --prune
   git switch main
   git pull --ff-only origin main
   git merge --ff-only origin/develop
   git diff --check ORIG_MAIN..HEAD
   git push origin main
   ```

   `ORIG_MAIN` é o SHA real previamente salvo. Antes do push, conferir que a lista de commits e arquivos ainda corresponde exatamente ao pacote homologado. Se a promoção não for fast-forward, **PARAR**.

2. O `push` na `main` aciona automaticamente `.github/workflows/deploy-hostgator-vps.yml` — **não disparar workflow_dispatch ou deploy manual em paralelo**. Não executar migrations automaticamente.
3. Monitorar a execução real do GitHub Actions até `success`. O workflow faz build na VPS, backup do frontend, `rsync --delete`, reinício de `sgp-api` e health check. Relatar etapas e erros; não interpretar apenas o push como deploy concluído.
4. Após sucesso do workflow, validar no domínio de produção `/api/v1/health`, a versão/commit publicado e executar smoke tests não destrutivos: login, menu Ajuda, painel, fila, planejamento, Kiosk com pesquisa por OS, por atividade e `OS & Atividade` (incluindo `Outra atividade`). Lançamentos de apontamento em produção somente se houver autorização e dados de teste adequados; caso contrário, testar no ambiente isolado.
5. Se uma falha ocorrer **antes do push**, não publicar. Se ocorrer **depois do push**, informar estado parcial imediatamente, preservar dados e seguir rollback controlado. Não fazer `git reset --hard` remoto à força, não mexer em `sgp_prod` nem restaurar backup automaticamente.

## Entrega e evidências

Criar `docs/ai/returns/promocao-main-deploy-producao-2026-10-16-retorno.md` com:

- Status inequívoco: `BLOQUEADO POR GATE`, `PUBLICADO E VALIDADO` ou `FALHA APÓS PUSH`.
- SHAs inicial e final das três branches; commits e arquivos inclusos.
- Inventário de funcionalidades com aprovação comprovada (não presumida).
- Comandos, resultados e exit codes dos testes/builds/CI.
- Backup de banco: caminho real, integridade e checksum sem expor segredos.
- Se houve deploy: URL e conclusão do GitHub Actions, checks de saúde e versão observada, data/hora e evidências.
- Migrations: confirmação de não execução ou detalhes de autorização específica.
- Registro de rollback e pendências.
- Estado final do working tree e local do retorno.

**Nunca declarar deploy concluído só porque a PR foi mergeada, a `main` avançou ou o GitHub Actions iniciou.**

## Decisão padrão para o estado atualmente conhecido

Como a homologação explicitamente confirmada nesta conversa cobre **apenas** `OS & Atividade` no Kiosk e a `develop` contém **67 commits e outras alterações funcionais**, o procedimento deve **parar na Fase A**, produzir o relatório e solicitar decisão sobre a aceitação integral da release ou autorização específica para preparar uma release isolada. Sem essa evidência, não tocar na `main` nem na produção.
