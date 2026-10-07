/** Utilitários de recorte para manter as imagens do manual focadas no conteúdo. */

/** Recorte do topo da página até o fim de `bottom` (+extra), opcionalmente sem o menu lateral. */
export async function clipToBottomOf(page, bottom, { extra = 24, withSidebar = true, top = 0 } = {}) {
  const box = await bottom.boundingBox()
  if (!box) throw new Error('clipToBottomOf: elemento sem bounding box')
  const vp = page.viewportSize()
  const x = withSidebar ? 0 : await sidebarRight(page)
  return { x, y: top, width: vp.width - x, height: Math.min(vp.height, box.y + box.height + extra) - top }
}

/** Borda direita do menu lateral (0 se não houver). */
export async function sidebarRight(page) {
  return page.evaluate(() => {
    const aside = document.querySelector('aside')
    if (!aside) return 0
    const r = aside.getBoundingClientRect()
    return r.width > 0 && r.left < 10 ? Math.round(r.right) : 0
  })
}

/** Recorte da união de caixas de vários locators, com margem. */
export async function unionClip(locators, pad = 16) {
  const boxes = []
  for (const l of locators) {
    const b = await l.boundingBox()
    if (b) boxes.push(b)
  }
  if (!boxes.length) throw new Error('unionClip: nenhum elemento visível')
  const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad)
  const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad)
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) + pad - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) + pad - y,
  }
}
