/**
 * Orientação do PDF da Evolução das Esteiras (impressão do navegador via `window.print()`).
 * Retrato é o padrão — preserva o comportamento anterior à opção de orientação.
 */
export type ConveyorProgressPdfOrientation = 'portrait' | 'landscape'

export const DEFAULT_CONVEYOR_PROGRESS_PDF_ORIENTATION: ConveyorProgressPdfOrientation =
  'portrait'

export const CONVEYOR_PROGRESS_PDF_ORIENTATION_OPTIONS: ReadonlyArray<{
  value: ConveyorProgressPdfOrientation
  label: string
}> = [
  { value: 'portrait', label: 'Retrato' },
  { value: 'landscape', label: 'Paisagem' },
]

export function parseConveyorProgressPdfOrientation(
  raw: string | null | undefined,
): ConveyorProgressPdfOrientation {
  return raw === 'landscape' ? 'landscape' : DEFAULT_CONVEYOR_PROGRESS_PDF_ORIENTATION
}

/**
 * Regra `@page` aplicada somente enquanto o relatório está montado para impressão.
 * Usa apenas a palavra-chave de orientação (sem tamanho de papel) para manter o papel
 * configurado na impressora/diálogo do navegador.
 */
export function buildConveyorProgressPageRule(
  orientation: ConveyorProgressPdfOrientation,
): string {
  return `@page { size: ${orientation}; margin: 10mm; }`
}
