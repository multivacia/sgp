/**
 * Catálogos mock para reaproveitar opção / área / etapa (cópia editável no draft).
 */

import type {
  NovaEsteiraAreaDraft,
  NovaEsteiraEtapaDraft,
  NovaEsteiraOpcaoDraft,
} from './nova-esteira-jornada-draft'
import { novoId, ordenarAreas, ordenarEtapas } from './nova-esteira-opcoes-helpers'

export type OpcaoReferenciaCatalogo = NovaEsteiraOpcaoDraft & {
  catalogoId: string
  descricaoCurta: string
}

const OPCOES_REF: OpcaoReferenciaCatalogo[] = [
  {
    catalogoId: 'ref-op-1',
    descricaoCurta: 'Pacote tapeçaria bancos + forros, ordem típica de oficina.',
    id: 'cat-op-1',
    titulo: 'Reforma bancos e forros — pacote padrão',
    origem: 'reaproveitada',
    ordem: 1,
    areas: [
      {
        id: 'ca-ar-x1',
        titulo: 'Desmontagem',
        origem: 'reaproveitada',
        ordem: 1,
        etapas: [
          {
            id: 'ca-et-x1',
            titulo: 'Retirar bancos e forros',
            tempoEstimadoMin: 240,
            origem: 'reaproveitada',
            ordem: 1,
          },
        ],
      },
      {
        id: 'ca-ar-x2',
        titulo: 'Montagem e acabamento',
        origem: 'reaproveitada',
        ordem: 2,
        etapas: [
          {
            id: 'ca-et-x2',
            titulo: 'Instalar e conferir',
            tempoEstimadoMin: 300,
            origem: 'reaproveitada',
            ordem: 1,
          },
        ],
      },
    ],
  },
  {
    catalogoId: 'ref-op-2',
    descricaoCurta: 'Foco em desmontagem e preparação antes do corte.',
    id: 'cat-op-2',
    titulo: 'Preparação e diagnóstico estendido',
    origem: 'reaproveitada',
    ordem: 1,
    areas: [
      {
        id: 'ca-ar-y1',
        titulo: 'Diagnóstico',
        origem: 'reaproveitada',
        ordem: 1,
        etapas: [
          {
            id: 'ca-et-y1',
            titulo: 'Checklist elétrico e tapeçaria',
            tempoEstimadoMin: 180,
            origem: 'reaproveitada',
            ordem: 1,
          },
        ],
      },
    ],
  },
]

export function listOpcoesReferenciaCatalogo(): OpcaoReferenciaCatalogo[] {
  return OPCOES_REF.map((o) => ({
    ...o,
    areas: o.areas.map((a) => ({
      ...a,
      etapas: a.etapas.map((e) => ({ ...e })),
    })),
  }))
}

export function clonarOpcaoReferenciaParaDraft(ref: OpcaoReferenciaCatalogo): NovaEsteiraOpcaoDraft {
  const areas: NovaEsteiraAreaDraft[] = ref.areas.map((a) => ({
    id: novoId('ar'),
    titulo: a.titulo,
    origem: 'reaproveitada',
    ordem: a.ordem,
    etapas: a.etapas.map((e) => ({
      id: novoId('et'),
      titulo: e.titulo,
      tempoEstimadoMin: e.tempoEstimadoMin,
      origem: 'reaproveitada',
      ordem: e.ordem,
    })),
  }))
  return {
    id: novoId('op'),
    titulo: ref.titulo,
    origem: 'reaproveitada',
    ordem: 1,
    areas: ordenarAreas(areas),
  }
}

const AREAS_REF: (NovaEsteiraAreaDraft & { catalogoId: string })[] = [
  {
    catalogoId: 'ref-ar-1',
    id: 'ca-ar-1',
    titulo: 'Desmontagem e inspeção',
    origem: 'reaproveitada',
    ordem: 1,
    etapas: [
      {
        id: 'ca-et-1',
        titulo: 'Registrar e fotografar',
        tempoEstimadoMin: 45,
        origem: 'reaproveitada',
        ordem: 1,
      },
      {
        id: 'ca-et-2',
        titulo: 'Remover componentes conforme OS',
        tempoEstimadoMin: 120,
        origem: 'reaproveitada',
        ordem: 2,
      },
    ],
  },
  {
    catalogoId: 'ref-ar-2',
    id: 'ca-ar-2',
    titulo: 'Corte e preparação de materiais',
    origem: 'reaproveitada',
    ordem: 1,
    etapas: [
      {
        id: 'ca-et-3',
        titulo: 'Conferir tecido e padrões',
        tempoEstimadoMin: 90,
        origem: 'reaproveitada',
        ordem: 1,
      },
    ],
  },
]

export function listAreasReferenciaCatalogo(): (NovaEsteiraAreaDraft & {
  catalogoId: string
})[] {
  return AREAS_REF.map((a) => ({
    ...a,
    etapas: a.etapas.map((e) => ({ ...e })),
  }))
}

export function clonarAreaReferenciaParaDraft(
  ref: NovaEsteiraAreaDraft & { catalogoId?: string },
): NovaEsteiraAreaDraft {
  return {
    id: novoId('ar'),
    titulo: ref.titulo,
    origem: 'reaproveitada',
    ordem: ref.ordem,
    etapas: ordenarEtapas(
      ref.etapas.map((e) => ({
        id: novoId('et'),
        titulo: e.titulo,
        tempoEstimadoMin: e.tempoEstimadoMin,
        origem: 'reaproveitada',
        ordem: e.ordem,
      })),
    ),
  }
}

const ETAPAS_REF: (NovaEsteiraEtapaDraft & { catalogoId: string })[] = [
  {
    catalogoId: 'ref-et-1',
    id: 'ce-1',
    titulo: 'Conferência final de acabamento',
    tempoEstimadoMin: 60,
    origem: 'reaproveitada',
    ordem: 1,
  },
  {
    catalogoId: 'ref-et-2',
    id: 'ce-2',
    titulo: 'Checkpoint com cliente / gestor',
    tempoEstimadoMin: 30,
    origem: 'reaproveitada',
    ordem: 1,
  },
]

export function listEtapasReferenciaCatalogo(): (NovaEsteiraEtapaDraft & {
  catalogoId: string
})[] {
  return ETAPAS_REF.map((e) => ({ ...e }))
}

export function clonarEtapaReferenciaParaDraft(ref: NovaEsteiraEtapaDraft): NovaEsteiraEtapaDraft {
  return {
    id: novoId('et'),
    titulo: ref.titulo,
    tempoEstimadoMin: ref.tempoEstimadoMin,
    origem: 'reaproveitada',
    ordem: ref.ordem,
  }
}
