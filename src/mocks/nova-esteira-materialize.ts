import type { BaseTarefaCatalogItem } from './bases-tarefa-catalog'
import { getBaseTarefa } from './bases-tarefa-catalog'
import {
  getBlocoOperacionalDef,
  nomeExibicaoBlocoOperacional,
  subopcaoLabel,
} from './blocos-operacionais-catalog'
import { idTarefaBlocoMaterializada } from './nova-esteira-deterministic'
import {
  type LinhaBlocoOperacionalDraft,
  type ModoMontagemBloco,
  type TarefaBlocoDraft,
} from './nova-esteira-domain'

/** Rótulos curtos para UI e preview (operacional). */
export function labelModoMontagem(m: ModoMontagemBloco): string {
  const map: Record<ModoMontagemBloco, string> = {
    REFERENCIA: 'Usar referência',
    MANUAL: 'Montar manualmente',
    BASICO: 'Usar básico',
  }
  return map[m]
}

export function linhaBlocoEstaConfigurada(
  linha: LinhaBlocoOperacionalDraft,
): boolean {
  const def = getBlocoOperacionalDef(linha.catalogoId)
  if (!def) return false
  if (def.subopcoes?.length && !linha.subopcaoId) return false
  if (linha.modo === null) return false
  if (linha.modo === 'REFERENCIA' && !linha.referenciaId) return false
  return true
}

/**
 * Resumo em uma linha para Etapa 2 e conferência final — linguagem operacional.
 */
export function humanizarResumoLinhaBloco(
  linha: LinhaBlocoOperacionalDraft,
  refs: BaseTarefaCatalogItem[],
): string {
  const def = getBlocoOperacionalDef(linha.catalogoId)
  if (!def) return ''

  const base = def.nomeLista
  const sub = subopcaoLabel(def, linha.subopcaoId)
  const part = sub ? `${base} · ${sub}` : base

  if (def.subopcoes?.length && !linha.subopcaoId) {
    return `${base} · Detalhe ainda não definido`
  }

  if (!linha.modo) {
    return `${part} · Montagem a definir`
  }

  const ok = linhaBlocoEstaConfigurada(linha)

  if (linha.modo === 'REFERENCIA') {
    if (!linha.referenciaId) {
      return `${part} · Referência ainda não escolhida`
    }
    const ref = refs.find((r) => r.id === linha.referenciaId)
    const refNome = ref?.nome ?? 'referência'
    return `${part} · Ref. ${refNome} · ${ok ? 'Configurado' : 'Pendente'}`
  }

  if (linha.modo === 'MANUAL') {
    return `${part} · Manual · ${ok ? 'Configurado' : 'Pendente'}`
  }

  if (linha.modo === 'BASICO') {
    return `${part} · Básico · ${ok ? 'Configurado' : 'Pendente'}`
  }

  return part
}

/**
 * @param seed Semente determinística da montagem (materialização mockada).
 */
export function materializarBlocosOperacionaisParaDrafts(
  linhas: LinhaBlocoOperacionalDraft[],
  seed: string,
): TarefaBlocoDraft[] {
  const out: TarefaBlocoDraft[] = []
  let ordem = 1
  for (const linha of linhas) {
    if (!linhaBlocoEstaConfigurada(linha)) continue
    const def = getBlocoOperacionalDef(linha.catalogoId)
    if (!def || linha.modo === null) continue

    const nomeBase = nomeExibicaoBlocoOperacional(
      linha.catalogoId,
      linha.subopcaoId,
    )
    const idBloco = idTarefaBlocoMaterializada(seed, ordem)

    if (linha.modo === 'BASICO') {
      const tpl = def.basico
      out.push({
        id: idBloco,
        nome: nomeBase,
        ordem: ordem++,
        setores: [...tpl.setores],
        atividadesCount: tpl.atividadesCount,
        estimativaMin: tpl.estimativaMin,
        observacao: 'Estrutura básica inicial (mock)',
        blocoOperacionalCatalogoId: linha.catalogoId,
        modoMontagem: 'BASICO',
      })
    } else if (linha.modo === 'MANUAL') {
      const mp = def.manualPadrao
      const obs = linha.observacaoManual?.trim()
      out.push({
        id: idBloco,
        nome: nomeBase,
        ordem: ordem++,
        setores: [...mp.setores],
        atividadesCount: mp.atividadesCount,
        estimativaMin: mp.estimativaMin,
        observacao: obs || 'Preenchimento manual (mock)',
        blocoOperacionalCatalogoId: linha.catalogoId,
        modoMontagem: 'MANUAL',
      })
    } else if (linha.modo === 'REFERENCIA' && linha.referenciaId) {
      const ref = getBaseTarefa(linha.referenciaId)
      if (!ref) continue
      out.push({
        id: idBloco,
        nome: `${nomeBase} · ${ref.nome}`,
        ordem: ordem++,
        setores: [...ref.setores],
        atividadesCount: ref.atividades.length,
        estimativaMin: ref.tempoBaseMin,
        observacao: `Referência: ${ref.referenciaOrigem}`,
        sourceBaseTarefaId: ref.id,
        blocoOperacionalCatalogoId: linha.catalogoId,
        modoMontagem: 'REFERENCIA',
      })
    }
  }
  return out
}
