/**
 * Caminhos do Manual do Usuário e dos Guias Práticos — sem imports, para poder
 * ser lido também pelo `vite.config.ts` (Node) e pelo plugin de publicação.
 *
 * A fonte única é o HTML em `docs/manual/` (o manual é gerado por
 * `npm run manual:usuario:html`; os guias são escritos à mão).
 * A aplicação não guarda cópia deles no repositório: o plugin de Vite os serve
 * em desenvolvimento e os inclui no build.
 */

/** Pasta de origem dos documentos de ajuda (relativa à raiz do repositório). */
export const MANUAL_SOURCE_DIR = 'docs/manual'

/** Prefixo público dos documentos de ajuda (mesmo domínio da aplicação). */
export const MANUAL_PUBLIC_DIR = '/manual'

/** Arquivo gerado (relativo à raiz do repositório). */
export const MANUAL_SOURCE_FILE = `${MANUAL_SOURCE_DIR}/manual-usuario.html`

/** URL estável do manual, servida pela própria aplicação (mesmo domínio). */
export const MANUAL_PUBLIC_PATH = `${MANUAL_PUBLIC_DIR}/manual-usuario.html`

/**
 * Pasta das capturas de tela dos guias (relativa a `MANUAL_SOURCE_DIR`).
 * Os guias as referenciam como `img/...`, então elas são publicadas no mesmo
 * caminho relativo.
 */
export const MANUAL_IMG_DIR = 'img'

export type PracticalGuideId = 'colaborador' | 'gestor'

/** Guias Práticos: mesmo nome de arquivo na origem e na URL pública. */
export const PRACTICAL_GUIDE_FILES: Readonly<Record<PracticalGuideId, string>> = {
  colaborador: 'colaborador.html',
  gestor: 'gestor-esteira.html',
}
