/**
 * Composição lado a lado de capturas reais (para marcações "antes/depois" ou "comparadas").
 * Gera uma página HTML local apenas com as imagens reais e legendas, e a captura pelo Playwright.
 */
import { readFile } from 'node:fs/promises'

export async function composePanels(context, { panels, file, columns = panels.length, title = null, width = 1440 }) {
  const imgs = await Promise.all(
    panels.map(async (p) => ({
      caption: p.caption,
      src: `data:image/png;base64,${(p.buffer ?? (await readFile(p.path))).toString('base64')}`,
    })),
  )
  const page = await context.newPage()
  await page.setViewportSize({ width, height: 800 })
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#eef2f7;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a}
    .wrap{padding:20px;display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:20px;align-items:start}
    h1{font-size:15px;margin:20px 20px 0;font-weight:700;color:#334155}
    figure{margin:0;background:#fff;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden}
    figcaption{padding:10px 14px;font-size:14px;font-weight:700;background:#f8fafc;border-bottom:1px solid #cbd5e1}
    img{display:block;width:100%;height:auto}
  </style></head><body>${title ? `<h1>${title}</h1>` : ''}<div class="wrap">${imgs
    .map((i) => `<figure><figcaption>${i.caption}</figcaption><img src="${i.src}"></figure>`)
    .join('')}</div></body></html>`)
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())))
  await page.screenshot({ path: file, fullPage: true })
  await page.close()
}
