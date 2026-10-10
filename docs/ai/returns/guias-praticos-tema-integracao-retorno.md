# Retorno — guias-praticos-tema-integracao

- **TASK_ID:** `guias-praticos-tema-integracao`
- **Data/hora:** 2026-10-10 (UTC)
- **Objetivo:** dar aos Guias Práticos (colaborador e gestor) o mesmo seletor de tema Claro/Escuro do Manual do Usuário e integrá-los ao SGP+ (menu **? Ajuda**).
- **Status final:** CONCLUÍDO (commit + push na branch de trabalho; sem PR, sem merge).
- **Branch:** `ccr-4b05a2d1-plgj52` (reiniciada a partir de `origin/develop`, que estava 51 commits à frente)
- **SHA inicial:** `54b23b5` (tip de `origin/develop`)
- **SHA final:** ver `git log -1` da branch (2 commits: `c10301b` + rodada 2)

## O que foi feito

1. **Tema nos guias** (`docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`):
   - barra no topo com **Claro / Escuro** e **← Voltar ao SGP+** (só aparece com `?integrado=1`), igual ao manual;
   - mesma prioridade de tema do manual: `?tema=` > preferência guardada `sgp.manual.tema` > sistema operacional > escuro. A preferência é **compartilhada** com o manual;
   - paleta clara (`:root[data-theme="claro"]`) com os mesmos valores do manual; cores fixas (`#fff`, `#cbd5e1`, código, fundo de imagem, dourado) trocadas por variáveis;
   - barra oculta na impressão. Conteúdo dos guias não foi alterado.
2. **Integração no SGP+:**
   - `vite-plugin-manual-usuario.ts` agora publica, em dev e no build (`dist/manual/`), o manual, os dois guias e as capturas de `docs/manual/img/` — byte a byte, só a lista conhecida (fontes `.md` não são publicadas);
   - `src/lib/help/manual-paths.ts`: constantes de pasta/arquivos dos guias;
   - `src/lib/help/manual-help.ts`: `PRACTICAL_GUIDES` e `buildGuideUrl` (mesmo `integrado=1&tema=` do manual);
   - `HelpMenu.tsx`: novos itens **Guia prático do colaborador** e **Guia prático do gestor**, após **Manual do usuário**, abrindo na mesma aba com o tema atual do SGP+.
3. `docs/manual/source/README.md`: documentado o uso/publicação dos guias e a regra de usar variáveis de cor ao editá-los.

## Rodada 2 (mesma sessão)

4. **Guia do gestor por permissão:** aprovado pelo humano. O item **Guia prático do gestor** só aparece para quem tem alguma permissão de gestão descrita no guia (`conveyors.create`, `conveyors.edit_status`, `conveyors.manage_assignments`, `collaborators_admin.view`, `teams.view`) — RBAC efetivo via `useAuth().canAny`. Perfil `COLABORADOR` padrão não tem nenhuma (migration `0013`), então vê só o guia do colaborador. É só visibilidade no menu: o arquivo continua acessível pela URL, como o manual completo, que também descreve telas de gestão.
5. **Falhas pré-existentes de "data de realização":** não eram bug funcional. O commit `b7585b3` (padronização pt-BR) trocou os botões `Registar apontamento` → `Registrar apontamento` e `Rever e registar` → `Revisar e registrar`, mas os testes `ApontamentoPage.test.tsx` e `ApontamentoGestorPage.test.tsx` seguiam com o texto antigo (pt-PT). Corrigidos só os seletores dos testes; o código de produção não mudou.

## Arquivos alterados

- `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`
- `docs/manual/source/README.md`
- `vite-plugin-manual-usuario.ts`
- `src/lib/help/manual-paths.ts`, `src/lib/help/manual-help.ts`, `src/lib/help/manual-help.test.ts`
- `src/components/shell/HelpMenu.tsx`, `src/components/shell/HelpMenu.test.tsx`
- `src/features/colaborador/ApontamentoPage.test.tsx`, `src/features/gestor/ApontamentoGestorPage.test.tsx` (rodada 2)
- `docs/ai/returns/guias-praticos-tema-integracao-retorno.md` (este)

## Migrations

Nenhuma.

## Decisões

- Guias publicados com o **mesmo nome de arquivo** (`/manual/colaborador.html`, `/manual/gestor-esteira.html`) para manter válidos os links relativos `img/...` e a abertura direta fora do SGP+.
- Guia do colaborador visível para todos; guia do gestor condicionado por RBAC (rodada 2, decisão do humano).
- Preferência de tema compartilhada com o manual (`sgp.manual.tema`), para não ter duas escolhas diferentes.

## Validação executada

| Comando | Resultado |
|---|---|
| `npx vitest run src/lib/help src/components/shell/HelpMenu.test.tsx` | 2 arquivos, 30 testes — **passou** |
| `npx vitest run` (suíte completa, rodada 1) | 1439 passaram, 5 falharam — pré-existentes na `develop` (textos pt-PT nos testes) |
| `npx vitest run` (suíte completa, rodada 2) | **218 arquivos, 1446 testes — todos passaram** |
| `npx tsc -b` | sem erros |
| `npm run build` | **passou**; `dist/manual/` contém manual, 2 guias e `img/` idênticos à origem (`cmp`) |
| `npm run lint` | 117 problemas — **idêntico** à `develop` sem esta alteração; nenhum nos arquivos tocados |
| `npm run manual:usuario:html:check` | passou (manual inalterado) |
| Dev server + Chromium (Playwright) | guias servidos em `/manual/*.html` (200, `text/html`) e PNGs (200, `image/png`); tema claro/escuro, gravação da preferência, "Voltar ao SGP+" só em modo integrado e layout em 390 px conferidos por captura |

## Pendências / riscos

- Ao editar os guias à mão, manter barra/scripts e variáveis de cor (regra registrada no README; teste cobre seletor e capturas).
- Lint: os 117 problemas pré-existentes da `develop` não foram tratados (fora do escopo).

## Próximo passo recomendado

Abrir PR da branch para `develop` e homologar o menu **? Ajuda** nos temas Light Executive e escuros.

## Git

- `git status` final: limpo após commit.
- Commit/push: branch `ccr-4b05a2d1-plgj52`. PR: não criado (não solicitado).

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
