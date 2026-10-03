# Retorno — `auditoria-cobertura-funcional-manual-sgp`

- **TASK_ID:** `auditoria-cobertura-funcional-manual-sgp`
- **Data/hora:** 2026-10-03 (UTC)
- **Status final:** concluída
- **Branch:** `docs/auditoria-cobertura-funcional-manual-sgp` (criada a partir de `origin/develop`)
- **SHA inicial / base:** `c611d10feacf329bdc217fe391ebf47a90a6ea7a` (= `origin/develop` = `origin/main` no início)
- **SHA final:** ver seção "Commit e push" abaixo
- **Working tree ao encerrar:** limpo

## Objetivo

Auditar a cobertura funcional de `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` contra o código atual, usando o código como fonte da verdade, e produzir relatório com evidências rastreáveis. Sem reescrever o manual.

## Resumo do que foi feito

1. Leitura obrigatória de contexto: `CLAUDE.md`, `AGENTS.md`, `docs/ai/context/PROJECT_CONTEXT.md`, `docs/ai/context/SESSION_CHECKPOINT.md` e o manual fonte.
2. `git fetch origin --prune`; conferência de `origin/develop`, `origin/main` e das branches existentes (nenhuma alterada ou removida).
3. Inventário funcional do sistema a partir do código: rotas (`src/routes/AppRoutes.tsx`, `ProductionRoutes.tsx`, `KioskRoutes.tsx`), menu (`src/lib/shell/app-nav-config.ts`), títulos (`src/lib/page-meta.ts`), features (`src/features/*`), módulos backend (`server/src/modules/*`) e migrations (53 arquivos).
4. Inventário das 50 seções do manual.
5. Cruzamento sistema × manual em 87 itens, com classificação principal e evidência por item.
6. Verificação amostral do catálogo de mensagens (seção 8.1): 19 mensagens literais conferidas no código — 19/19 presentes.
7. Resolução de 4 pontos que o manual deixava como `PENDENTE DE VALIDAÇÃO` (VAL-006, VAL-014, VAL-015 e o menu de gestão por atividade), além de confirmar VAL-004 e ampliar VAL-017.

## Arquivos criados / alterados / removidos

Criados:
- `docs/ai/reports/auditoria-cobertura-funcional-manual-2026-10-02/RELATORIO_AUDITORIA_COBERTURA_FUNCIONAL_MANUAL.md`
- `docs/ai/returns/auditoria-cobertura-funcional-manual-sgp-retorno.md` (este arquivo, exigido por `CLAUDE.md` §4)

Alterados: nenhum.
Removidos: nenhum.

Preservados intactos, conforme restrições da atividade: `docs/manual/source/MANUAL_FUNCIONAL_SGP.md`, todo `src/`, todo `server/`, `server/migrations/`, testes, `docs/audits/`, HTML derivados do manual, `main` e `develop`.

## Migrations envolvidas

Nenhuma. Migrations foram apenas **lidas** como evidência (`0007`, `0028`, `0042`, `0048`, `0050`). Diretório atual vai até `0053`.

## Resultados por classificação

| Classificação | Itens |
|---|---|
| `PARCIAL` | 33 |
| `OK` | 16 (inclui 1 "OK por omissão deliberada") |
| `TECNICO_DEMAIS` | 13 |
| `AUSENTE` | 12 |
| `DESATUALIZADO` | 7 |
| `NAO_CONFIRMADO` | 6 (1 resolvido nesta auditoria) |
| **Total** | **87** |

## Principais lacunas encontradas

1. O arquivo auditado não é um manual de usuário: é a "Auditoria Funcional e Matriz Mestre de Documentação". Factualmente confiável, inoperante como manual.
2. "Modo Fábrica" — nome do canal operacional na interface — aparece **0 vezes** no manual, que usa "Kiosk" e "Produção Web".
3. O Painel operacional filtra por 7 *buckets* (+ "Ativas") que não são os 7 status do ciclo de vida: `A_INICIAR`+`EM_ANDAMENTO` colapsam em "Em execução" e "Em atraso" sobrepõe o status real. Não documentado.
4. ATI-001 lista 6 estados de atividade; o backend só escreve 4 (`PENDING`, `COMPLETED`, `REOPENED`, `ABORTED`).
5. MSG-ATI-005 afirma que só atividade concluída pode reabrir; o código aceita também atividade dispensada.
6. "Laboratório de Esteiras" (`/app/gestao/esteiras/laboratorio`) — quarto caminho de criação de esteira — sem nenhuma cobertura (e sem ponto de entrada na navegação).
7. Duas das três planilhas do sistema não estão no manual: "Exportar visão semanal" e a impressão/PDF da Evolução das Esteiras.
8. A gaveta global "Apontar horas", presente no cabeçalho de todas as telas, aparece como um único bullet dentro do capítulo da Agenda.
9. `STEP` vaza na própria interface ("Etapa (STEP)", "Atividades (STEPs)", "Alocações em STEPs", "STEP: PENDING") e o manual perpetua o termo (16 ocorrências).
10. Jornada é a única área com divergência de código comprovadamente posterior ao snapshot do manual (`7eba08c0`): seleção multi-colaborador e teto de 20 por consulta não documentados; 45.5 usa redação que o produto removeu em `59924074`.

## Decisões técnicas e de negócio relevantes

- **Classificação única por item**, com problemas secundários registrados nas observações e nas seções D a G, conforme instrução da atividade.
- **Nenhum percentual de cobertura foi declarado**: não existe denominador contável e defensável de "funcionalidades" no repositório. A matriz e a contagem por classificação são a medida.
- **O menu de gestão por atividade (`GestorAtividadeMenu`) não deve ser documentado**: está em `EsteiraDetalheMockPage`, que não é referenciada por nada, e grava apenas em memória (`src/mocks/esteira-gestao-runtime.ts`). Decisão registrada no relatório para impedir inclusão futura por engano.
- **Eventos `CONVEYOR_STEP_BLOCKED/UNBLOCKED/PAUSED/RESUMED` não devem ser documentados**: existem só na camada de apresentação, sem nenhum produtor em `server/src` ou `server/migrations`. Resolve VAL-014.
- **A branch dedicada do enunciado foi usada** (`docs/auditoria-cobertura-funcional-manual-sgp`) em vez da branch de sessão, por instrução explícita do prompt da atividade.
- `SESSION_CHECKPOINT.md` **não** foi atualizado: não houve handoff, não há métrica confiável de uso de contexto e as restrições da atividade limitam alterações ao relatório e ao que as regras do repositório exigirem.
- `docs/ai/prompts/<TASK_ID>.md` **não** foi criado: `CLAUDE.md` §3 condiciona o arquivo ao caso em que o prompt é salvo no repositório, e as restrições da atividade não autorizam arquivos além do relatório e deste retorno.

## Comandos de validação executados

| Comando | Resultado real |
|---|---|
| `git fetch origin --prune` | OK; `origin/develop` e `origin/main` em `c611d10f` |
| `git rev-list --count 8e9fd062..c611d10f` | `16` |
| `git merge-base --is-ancestor 8e9fd062 b2a40f69` | exit ≠ 0 (não ancestral) |
| `git merge-base --is-ancestor b2a40f69 8e9fd062` | exit ≠ 0 (não ancestral) |
| `git diff --name-only 8e9fd062 c611d10f \| grep -v '^docs/'` | 21 arquivos (concentrados em `operational-journey`, `JornadaColaboradorGestorPage`, tema) |
| `git checkout -b docs/auditoria-cobertura-funcional-manual-sgp origin/develop` | branch criada em `c611d10f` |
| Conferência literal de 19 mensagens da seção 8.1 contra `src/` e `server/src/` | 19/19 encontradas |
| `grep -c "Modo Fábrica" docs/manual/source/MANUAL_FUNCIONAL_SGP.md` | `0` |
| Produtores de `CONVEYOR_STEP_BLOCKED/PAUSED/UNBLOCKED/RESUMED` em `server/src` e `server/migrations` | `0` |
| Escritores de `'BLOCKED'` / `'IN_PROGRESS'` como status de atividade em `server/src` | nenhum (só declarações de tipo) |
| Referências a `EsteiraDetalheMockPage` | apenas a própria declaração |
| Links para `/app/minhas-atividades` e `/app/meu-trabalho` | nenhum item de menu; só ícones em `AppSidebar.tsx:114,136` |
| `git status --short` / `git diff --cached --name-only` antes do commit | somente os 2 arquivos de documentação acima |

## Resultado real de build, lint e testes

**Não executados.** A atividade não alterou nenhum arquivo de aplicação, migration ou teste; os únicos arquivos criados são dois Markdown de documentação, fora de qualquer pipeline de build, lint ou teste. Nenhum resultado de build/lint/teste é alegado.

## Pendências, riscos e ressalvas

Pendências de decisão humana (bloqueiam parte da redação futura do manual):
1. Enum cru exibido no card de encaixe da fábrica ("STEP: PENDING") — `FactoryIntakeItemCard.tsx:18-28,51`.
2. Parâmetros de URL e coluna de banco expostos na cópia do Painel operacional — `backlogCopy.ts:20-50`.
3. Mensagem de reset de PIN que diz "nova senha" — `ColaboradoresPage.tsx:895`.
4. "Laboratório de Esteiras" deve ser exposto na navegação ou é oculto por decisão?
5. "Minhas Atividades" e "Meu Trabalho" permanecem sem item de menu?

Riscos e limitações da auditoria:
1. Auditoria por leitura de código, migrations e testes. Nenhuma tela foi executada ou observada visualmente; nenhum banco foi consultado.
2. Cobertura por amostragem direcionada, não varredura exaustiva: 87 itens cobrindo todas as áreas do escopo, com profundidade desigual, priorizando onde o risco de orientação errada é maior.
3. Verificação do catálogo de mensagens é amostral (19 de ~80).
4. Permissões lidas de rotas, `app-nav-config.ts` e migrations; o estado efetivo de RBAC em banco não foi verificado — VAL-010 e VAL-011 seguem abertos.
5. Decisões funcionais pendentes do manual (VAL-001 a VAL-003, VAL-005, VAL-007 a VAL-013, VAL-016) não foram decididas.
6. `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html` não foram auditados (fora do escopo instruído), o que é relevante porque a coluna "Cobertura atual" do manual se refere a eles.

## Próximo passo recomendado

Seguir a sequência da seção J do relatório, começando pela **Etapa 0** (decisões de produto nos 5 pontos acima e a escolha de separar documento-fonte técnico de manual de usuário), porque ela condiciona a redação das etapas seguintes. Em seguida, Etapa 1 (correções factuais baratas: ATI-001, MSG-ATI-005, VAL-017, 45.4/45.5, cabeçalho com SHA, 47.3) e Etapa 2 (navegação e taxonomia de buckets).

## Caminho do relatório

`docs/ai/reports/auditoria-cobertura-funcional-manual-2026-10-02/RELATORIO_AUDITORIA_COBERTURA_FUNCIONAL_MANUAL.md`

## Commit e push

- Commit: `docs: audita cobertura funcional do manual SGP`
- Branch remota: `origin/docs/auditoria-cobertura-funcional-manual-sgp`
- PR: não criado (o enunciado da atividade determina não abrir PR).
- Merge em `develop` ou `main`: não realizado.
- Force-push / reescrita de histórico: não realizados.
- SHA do commit: `<preenchido após o commit — ver seção final>`

## Uso de contexto / sessão

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`
