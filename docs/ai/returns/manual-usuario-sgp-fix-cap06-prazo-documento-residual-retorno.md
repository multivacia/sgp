# Retorno — manual-usuario-sgp-fix-cap06-prazo-documento-residual

- **TASK_ID:** `manual-usuario-sgp-fix-cap06-prazo-documento-residual`
- **Data:** 2026-10-04 (UTC)
- **Status final:** CONCLUÍDO (rodada documental; build, lint e testes **não executados**).
- **Branch:** `docs/manual-usuario-sgp-fix-cap06-prazo-documento-residual`
- **SHA base:** `5b045adbf5d00334d8f332d9c3cdabff42a725c7` (confere; capítulo 17 é ancestral)
- **SHA final:** commit único desta branch que contém este arquivo (`git log -1`).

## Arquivos alterados
- `docs/manual/source/MANUAL_USUARIO_SGP.md` (1 linha, Capítulo 6, subseção "O prazo da esteira")
- este retorno

## Trecho corrigido
- **Original:** "Em esteiras antigas, ou nas criadas **Por documento**, o prazo pode ter sido gravado como um texto único; …"
- **Nova redação:** "Em esteiras antigas, o prazo pode ter sido gravado como um texto único; …" (resto da frase inalterado).

## Evidência funcional
Já comprovada na rodada anterior, no mesmo código: na importação de ordem de serviço, `cliente`, `placa` e `prazoEstimado` vão em branco (`draftToCreateConveyorInput.ts`); teste `draftToCreateConveyorInput.test.ts` com prazo `01/01/2099` termina com prazo vazio; no modo local todo PDF segue esse fluxo; sem código Nano em `src/` e `server/src/`; correspondência pelo texto dos serviços × matrizes. Não revalidei além do necessário; o código não mudou desde então.

## Validações
- `git diff --check`: sem saída. Diff: 1 linha. Item 6.8, Capítulo 17, Capítulo 21 e demais capítulos intactos. Sem termos técnicos novos.
- Coerência: 6.8, Capítulo 17 e Capítulo 21 dizem que a criação por documento não grava o prazo; o Capítulo 6 agora não contradiz.

## Pendências fora do escopo (mantidas)
Termos técnicos da interface (ARGOS, draft, partItems), "Ficheiro", persistência de Cliente/Placa/Prazo, código Nano. Linha **Situação** não alterada. Metadado "Revisão deste manual" mantido em `2026-10-03` (desatualizado).

Sem PR, merge, rebase ou force-push. Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
