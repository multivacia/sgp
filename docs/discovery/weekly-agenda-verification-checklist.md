# Checklist de verificação — Agenda Semanal

A partir do PR-4 (correções visuais), **nenhum PR desta feature** é considerado pronto para revisão sem as três seções abaixo preenchidas.

## 1. Verificado em runtime (Playwright)

Asserções automatizadas de estado: mutação de draft, save/publish, IDs de drop, dirty flag, etc.

```bash
node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-desktop [baseUrl]
node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-mobile [baseUrl]
node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-mid-drag [baseUrl]
node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-day-tab-drop [baseUrl]
node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-mobile-reorder [baseUrl]
```

node scripts/capture-weekly-agenda-mobile.mjs --scenario pr4-drag-follow-trail [baseUrl]
```

**Prova de movimento contínuo (overlay segue ponteiro):** `pr4-drag-follow-trail` grava `docs/discovery/pr4-drag-follow-trail.webm` + 4 frames em `pr4-drag-follow-trail-frames/` e falha se o centro do overlay não acompanhar o mouse (≥80px de deslocamento, erro ≤24px).

**Limite conhecido:** Playwright valida estado e presença de elementos, não percepção visual (“parece errado”). Bugs de overlay exigiam prova em vídeo/frames — ver cenário acima. Validação humana em browser real ainda recomendada para touch.

## 2. Verificado por humano (obrigatório)

Print sequencial ou vídeo/gif de interação **real** no navegador (não gravação Playwright). Uma pessoa clica/arrasta e captura o resultado.

### Roteiro mínimo (~5 min) para o gestor

1. Abrir `/app/agenda-semanal` em viewport desktop (≥1280px) com plano publicado e alterações dirty se possível.
2. Abrir backlog (FAB), arrastar um item até a grade — **verificar:** card segue o cursor; banner “Arrastando” sozinho (sem avisos de dirty/publicado); sexta-feira não cortada; FAB no canto sem cobrir célula.
3. Soltar na célula, salvar rascunho.
4. Redimensionar janela para ~390px, selecionar aba de um dia, arrastar card planejado para reordenar — **verificar:** overlay segue o dedo/mouse.
5. Capturar 2–3 prints ou um gif curto cobrindo os passos 2 e 4.

Salvar evidência em `docs/discovery/` com prefixo do PR (ex.: `pr4-visual-humano-*.png`).

## 3. Não verificado

Listar explicitamente o que ficou de fora (ex.: tablet físico, tema light-executive, impressão térmica nesta passagem).

---

## Registro desta correção (PR-4 bugs visuais)

| Bug | Correção aplicada |
|-----|-------------------|
| Card não segue cursor | **Causa raiz (2ª tentativa):** `DragOverlay` sem portal em `document.body` — fixed positioning quebrado dentro de `<main overflow-y-auto>`. **Fix:** portal + `snapCenterToCursor` custom |
| Overflow + FAB | Grade sempre `overflow-x-auto`; FAB via portal em `document.body`; padding `pb-24 lg:pr-20` |
| Avisos empilhados | `suppressSecondaryHints` no header durante arraste |

**Evidência Playwright overlay:** `docs/discovery/pr4-drag-follow-trail.webm` + frames `pr4-drag-follow-trail-frames/`

**Seção 2 (humano):** pendente — gestor valida em browser real (touch/tablet).
