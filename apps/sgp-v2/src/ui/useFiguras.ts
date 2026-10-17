import { useCallback, useEffect, useState } from 'react'
import { listarFotos } from '../api/etapaImagens'
import { fotoDaEtapa, type FotoEtapa } from '../domain/fotosEtapas'
import { figuraDaEtapa } from '../domain/novaEsteira'

/** Figura da etapa: a foto cadastrada, senão a ilustração provisória. */
export function useFiguras() {
  const [fotos, setFotos] = useState<FotoEtapa[]>([])
  useEffect(() => {
    let vivo = true
    void listarFotos().then((f) => vivo && setFotos(f))
    return () => {
      vivo = false
    }
  }, [])
  return useCallback((nome: string, matrixNodeId?: string) => fotoDaEtapa(fotos, nome, matrixNodeId) ?? figuraDaEtapa(nome), [fotos])
}
