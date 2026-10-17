/**
 * Fotos de exemplo para escolher no lugar da câmera (só a demonstração registra alguma;
 * no app real a lista fica vazia e o botão "Exemplos" não aparece).
 */
export type FotoExemplo = { nome: string; url: string }

let lista: FotoExemplo[] = []

export function definirFotosExemplo(fotos: FotoExemplo[]): void {
  lista = fotos
}

export function fotosExemplo(): FotoExemplo[] {
  return lista
}
