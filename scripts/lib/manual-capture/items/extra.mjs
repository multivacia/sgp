/** Capturas extras (sem marcação no manual). */
import { panelHandlers } from './cap05.mjs'

export default [
  {
    id: 'extra-ajuda-menu',
    file: 'extra-ajuda-menu.png',
    chapter: 'Extra — Barra superior (menu Ajuda)',
    section: null,
    marker: 'EXTRA: menu Ajuda aberto na barra superior (src/components/shell/HelpMenu.tsx).',
    route: '/app/backlog',
    scenario: 'Painel operacional (tela inicial da gestão) com o menu "? Ajuda" da barra superior aberto: "Como usar esta tela" (ajuda contextual), "Manual do usuário" e "Abrir chamado".',
    handlers: panelHandlers,
    async run({ page, shot }) {
      await page.getByRole('button', { name: 'Ajuda' }).click()
      const menu = page.getByRole('menu')
      await menu.waitFor()
      await shot(null, { clip: { x: 0, y: 0, width: 1440, height: 420 } })
    },
  },
]
