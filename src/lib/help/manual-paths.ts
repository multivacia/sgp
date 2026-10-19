/**
 * Caminhos dos Guias Práticos — sem imports, para poder ser lido também pelo
 * `vite.config.ts` (Node) e pelo plugin de publicação.
 *
 * A fonte única é o HTML escrito à mão em `docs/manual/`. A aplicação não guarda
 * cópia dele no repositório: o plugin de Vite o serve em desenvolvimento e o
 * inclui no build.
 *
 * Release `tati-kiosk` (main): só os Guias Práticos são publicados. O Manual do
 * Usuário integrado e a ajuda contextual existem na `develop`, mas não fazem
 * parte desta release.
 */

/** Pasta de origem dos documentos de ajuda (relativa à raiz do repositório). */
export const MANUAL_SOURCE_DIR = 'docs/manual'

/** Prefixo público dos documentos de ajuda (mesmo domínio da aplicação). */
export const MANUAL_PUBLIC_DIR = '/manual'

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
