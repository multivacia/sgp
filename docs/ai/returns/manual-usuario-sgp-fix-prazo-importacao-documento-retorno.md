# Retorno — manual-usuario-sgp-fix-prazo-importacao-documento

- **TASK_ID:** `manual-usuario-sgp-fix-prazo-importacao-documento`
- **Data:** 2026-10-04 (UTC)
- **Objetivo:** remover do manual as afirmações de que o prazo da esteira vem do documento importado.
- **Status final:** CONCLUÍDO (rodada documental; build, lint e testes **não executados**).
- **Branch:** `docs/manual-usuario-sgp-fix-prazo-importacao-documento`
- **SHA base:** `39434b2e0c5f21bdf6825ae9493cf08e21fbadad` (confere; cadeia documental anterior é ancestral)
- **SHA final:** commit único desta branch que contém este arquivo (`git log -1`).

## Arquivos alterados
- `docs/manual/source/MANUAL_USUARIO_SGP.md` (4 linhas)
- este retorno

## Trechos corrigidos
1. **6.8** — o prazo deixa de ser "geralmente já preenchido pela leitura do documento"; agora diz que o campo serve de conferência, não é gravado e a esteira criada fica sem prazo, com remissão ao capítulo 17.
2. **Capítulo 21, tabela de prazo** — linha da tela por documento: não grava; esteira nasce sem prazo.
3. **Capítulo 21, "Consequência prática"** — formatos antigos ocorrem só em esteiras antigas; esteira por documento nasce sem prazo.
4. **Capítulo 21, nota "Correção de 2026-10-03"** — o campo sobrevive na tela por documento só como exibição, sem gravar.

Cabeçalho **Situação**: não alterado (nenhuma mudança factual).

## Evidência funcional (revalidada no código)
- `draftToCreateConveyorInput.ts`: com importação de ordem de serviço, `cliente`, `placa` e `prazoEstimado` são gravados como vazios.
- `draftToCreateConveyorInput.test.ts` (caso `bravoOsDocumentImport`): entrada com cliente, placa e prazo `01/01/2099` resulta em `cliente`, `placa` e `prazoEstimado` vazios.
- `interpretBravoDeterministic.ts`: `heuristicSource: 'bravo_deterministic'` incondicional no modo local, logo o fluxo padrão sempre cai nesse caso.
- Busca por "Nano" em `src/` e `server/src/`: zero ocorrências; sem código Nano.
- Correspondência: texto dos serviços × atividades/tarefas das matrizes (`matchOperationalItems.ts`).

## Validações
- `git diff --check`: sem saída. Diff: 4 linhas, só os trechos acima. Capítulo 17 e demais capítulos intactos (hunks restritos a 6.8 e capítulo 21). Sem termos técnicos novos. Build/lint/testes: não executados.

## Pendência residual dentro do manual (não alterada, fora do escopo autorizado)
- **Capítulo 6, seção de prazo (linha ~790):** "Em esteiras antigas, ou nas criadas **Por documento**, o prazo pode ter sido gravado como um texto único…". Ainda sugere gravação pela tela por documento. Recomenda-se ajuste em rodada própria.

## Fora de escopo mantido
Termos técnicos da interface (ARGOS, draft, partItems), "Ficheiro", persistência de Cliente/Placa/Prazo, código Nano, funcionalidades.

## Metadado "Revisão deste manual"
Mantido `2026-10-03` (desatualizado; pendência).

Sem PR, merge, rebase ou force-push. Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
