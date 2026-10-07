# Capturas do Manual do Usuário SGP+

Imagens reais da interface do SGP+ para o `docs/manual/source/MANUAL_USUARIO_SGP.md`,
geradas com o frontend atual + Playwright headless e **API 100% mockada** (sem backend, banco,
migrations ou dados reais).

- Uma imagem por marcação `[IMAGEM SUGERIDA: ...]` do manual (51) + `extra-ajuda-menu.png` (menu **Ajuda**).
- `manifest.json` liga cada marcação (capítulo, seção, linha) → cenário → arquivo → endpoints mockados → status.
- Status: `CAPTURED`, `BLOCKED` (divergência manual × código, descrita em `notes`),
  `REQUIRES_EXTERNAL_VIEWER`, `NOT_APPLICABLE`.
- `*.xlsx`: planilhas reais geradas pelos builders do backend, preservadas como evidência dos itens de exportação.

As imagens **ainda não estão inseridas no manual**; isso é feito após revisão humana.

## Como reproduzir

Pré-requisitos (ambiente efêmero; nada disso altera `package.json`/`package-lock.json`):

```bash
npm ci
# Playwright: módulo + Chromium. Se não houver no ambiente:
npm install --no-save --package-lock=false playwright
npx playwright install chromium
# Somente para os itens de payload/planilha gerados com código real do backend
# (cap08-05, cap12-03, cap14-*, cap18-*):
(cd server && npm ci)
# Para renderizar as planilhas (cap08-05, cap12-03): LibreOffice (soffice) e poppler (pdftoppm).
```

Suba **somente** o frontend, com as variáveis que deixam a barra superior igual à de produção
(botão *Abrir chamado* e selo de versão sem divergência):

```bash
VITE_APP_ENV=production VITE_SUPPORT_TICKETS_ENABLED=true npm run dev -- --host 127.0.0.1 --port 5174
```

Em outro terminal:

```bash
node scripts/capture-manual-screenshots.mjs                 # todas as capturas
node scripts/capture-manual-screenshots.mjs --id cap08-03   # uma captura (pode repetir --id)
node scripts/capture-manual-screenshots.mjs --chapter 8     # um capítulo
node scripts/capture-manual-screenshots.mjs --list          # inventário marcação → item
node scripts/capture-manual-screenshots.mjs --validate      # validações (sem navegador)
```

Execuções parciais atualizam apenas as entradas correspondentes do `manifest.json`.

## Determinismo

- Relógio do navegador fixo em **01/07/2026 10:00** (America/Sao_Paulo), locale `pt-BR`, tema **Light Executive**.
- Viewport padrão 1440×1000, `deviceScaleFactor` 1; exceções registradas no manifesto (`viewport`).
- Chromium em modo *new headless* (`channel: 'chromium'`, `--lang=pt-BR`) para que campos de data usem dd/mm/aaaa.
- Animações/transições desligadas; esperas por seletores/estados explícitos.

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
| `scripts/capture-manual-screenshots.mjs` | CLI: execução, recorte, manifesto e validação |
| `scripts/lib/manual-capture/inventory.mjs` | leitura programática das marcações do manual |
| `scripts/lib/manual-capture/mock-api.mjs` | roteador `/api/**`; chamada sem mock = registrada como inesperada (404) |
| `scripts/lib/manual-capture/fixtures/` | dados fictícios (Ana Demo, Carlos Demo, Cliente Exemplo, `*.example`, placa `ABC1D23`) |
| `scripts/lib/manual-capture/items/capNN.mjs` | um módulo por capítulo: cenário, navegação e recorte de cada item |
| `scripts/lib/manual-capture/server/*.ts` | pontes que executam código **real** do backend sem banco (serviço de evolução das esteiras, regras de saúde operacional e builders de Excel) |
| `scripts/lib/manual-capture/xlsx-render.mjs` | renderização local `.xlsx` → PNG (LibreOffice + pdftoppm) |

O `--validate` confere: número de marcações, item ↔ manifesto, arquivos `CAPTURED` existentes e não
vazios, nenhum arquivo sem entrada no manifesto, presença do `extra-ajuda-menu.png`, nenhuma chamada
`/api` inesperada em itens capturados e ausência de e-mails/domínios reais nas fixtures.
