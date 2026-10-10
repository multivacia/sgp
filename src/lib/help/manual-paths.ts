/**
 * Caminhos do Manual do Usuário — sem imports, para poder ser lido também pelo
 * `vite.config.ts` (Node) e pelo plugin de publicação.
 *
 * A fonte única é o HTML gerado por `npm run manual:usuario:html`.
 * A aplicação não guarda cópia dele no repositório: o plugin de Vite o serve em
 * desenvolvimento e o inclui no build.
 */

/** Arquivo gerado (relativo à raiz do repositório). */
export const MANUAL_SOURCE_FILE = 'docs/manual/manual-usuario.html'

/** URL estável do manual, servida pela própria aplicação (mesmo domínio). */
export const MANUAL_PUBLIC_PATH = '/manual/manual-usuario.html'
