/** Catálogo de itens de captura (um por marcação do manual + extras). */
import cap04 from './cap04.mjs'
import cap05 from './cap05.mjs'
import cap06 from './cap06.mjs'
import cap07 from './cap07.mjs'
import cap08 from './cap08.mjs'
import cap09 from './cap09.mjs'
import cap10 from './cap10.mjs'
import cap11 from './cap11.mjs'
import cap12 from './cap12.mjs'
import cap13 from './cap13.mjs'
import cap14 from './cap14.mjs'
import cap15 from './cap15.mjs'
import cap16 from './cap16.mjs'
import extra from './extra.mjs'

const all = [...cap04, ...cap05, ...cap06, ...cap07, ...cap08, ...cap09, ...cap10, ...cap11, ...cap12, ...cap13, ...cap14, ...cap15, ...cap16, ...extra]

export const ITEMS = all.map((it) => ({
  ...it,
  chapterNumber: it.chapterNumber ?? (Number.parseInt(it.id.replace(/^cap/, ''), 10) || 0),
}))
