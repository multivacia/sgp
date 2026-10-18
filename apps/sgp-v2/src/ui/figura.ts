import type { SyntheticEvent } from 'react'
import { reservaDaFigura } from '../domain/novaEsteira'

/** `onError` das figuras de etapa: troca o recorte que não carregou pelo ícone, inteiro e com respiro. */
export function trocarPelaReserva(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  const reserva = reservaDaFigura(img.getAttribute('src') ?? '')
  if (!reserva) return
  img.src = reserva
  img.style.objectFit = 'contain'
  img.style.padding = '30% 15% 6%' // topo maior: não fica sob os selos de número e status
}
