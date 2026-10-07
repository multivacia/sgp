/** Capturas extras (sem marcação no manual). */
import { rbacHandlers } from './cap04.mjs'

export default [
  {
    id: 'extra-ajuda-menu',
    file: 'extra-ajuda-menu.png',
    chapter: 'Extra — Barra superior (menu Ajuda)',
    section: null,
    marker: 'EXTRA: menu Ajuda aberto na barra superior (src/components/shell/HelpMenu.tsx).',
    route: '/app/permissoes-por-papel',
    scenario: 'Menu "? Ajuda" da barra superior aberto, com a ajuda contextual da tela atual, o manual completo e Abrir chamado.',
    handlers: rbacHandlers,
    async run({ page, shot }) {
      await page.getByRole('button', { name: 'Ajuda' }).click()
      const menu = page.getByRole('menu')
      await menu.waitFor()
      await shot()
    },
  },
]
