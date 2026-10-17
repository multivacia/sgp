import { useCallback, useEffect, useState } from 'react'
import { listarFotos } from '../api/etapaImagens'
import { fotoDaEtapa, type FotoEtapa } from '../domain/fotosEtapas'
import { figuraDaEtapa } from '../domain/novaEsteira'
import { aoMudarLocais, listarLocais } from './fotosLocais'

/** Figura da etapa: a foto ainda neste aparelho, senão a do banco, senão a ilustração provisória. */
export function useFiguras() {
  const [fotos, setFotos] = useState<FotoEtapa[]>([])
  const [locais, setLocais] = useState<FotoEtapa[]>([])
  useEffect(() => {
    let vivo = true
    let urls: string[] = []
    // ao enviar uma foto, a local sai e a do banco entra: recarrega as duas
    const carregarLocais = () => {
      void listarFotos().then((f) => vivo && setFotos(f))
      void listarLocais('etapa').then((ls) => {
        if (!vivo) return
        urls.forEach((u) => URL.revokeObjectURL(u))
        const novos = ls.map((l) => ({ matrixNodeId: l.alvoId, nome: l.nome ?? '', atualizadaEm: l.criadaEm, url: URL.createObjectURL(l.blob) }))
        urls = novos.map((n) => n.url)
        setLocais(novos)
      })
    }
    carregarLocais()
    const parar = aoMudarLocais(carregarLocais)
    return () => {
      vivo = false
      parar()
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])
  return useCallback((nome: string, matrixNodeId?: string) => fotoDaEtapa(locais, nome, matrixNodeId) ?? fotoDaEtapa(fotos, nome, matrixNodeId) ?? figuraDaEtapa(nome), [fotos, locais])
}
