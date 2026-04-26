import type { NovaEsteiraEstruturaOrigem } from '../../../../mocks/nova-esteira-domain'
import type { BaseEsteiraCatalogItem } from '../../../../mocks/bases-esteira-catalog'

type Props = {
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  baseCatalog: BaseEsteiraCatalogItem | null
  veioDeBase: boolean
}

export function NovaEsteiraReviewOrigem({
  estruturaOrigem,
  baseCatalog,
  veioDeBase,
}: Props) {
  return (
    <section
      className="rounded-2xl border border-cyan-500/22 bg-cyan-500/[0.06] p-5 ring-1 ring-white/[0.05]"
      aria-labelledby="review-origem"
    >
      <h3
        id="review-origem"
        className="font-heading text-base font-bold text-slate-100"
      >
        Origem e rastreabilidade
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Referências históricas no registro — a esteira nasce como snapshot independente; a
        Base não permanece como vínculo vivo (
        <span className="text-slate-400">conveyor_bases</span> no backend futuro).
      </p>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Como foi iniciada
          </dt>
          <dd className="mt-1 text-slate-100">
            {veioDeBase
              ? 'A partir de uma base de esteira do catálogo (estrutura copiada para o draft e editável).'
              : estruturaOrigem === 'MONTAGEM_UNIFICADA'
                ? 'Montagem operacional — opções criadas manualmente ou a partir de referências do catálogo.'
                : '—'}
          </dd>
        </div>

        {veioDeBase && baseCatalog ? (
          <>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Base utilizada
              </dt>
              <dd className="mt-1 font-medium text-slate-50">{baseCatalog.nome}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Identificador (mock)
              </dt>
              <dd className="mt-1 font-mono text-xs text-slate-400">{baseCatalog.id}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Código / versão
              </dt>
              <dd className="mt-1 text-slate-400">
                Código e versão da base aparecerão aqui quando integrados a{' '}
                <code className="text-slate-500">conveyor_bases</code> (API real).
              </dd>
            </div>
          </>
        ) : (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Base de Esteira
            </dt>
            <dd className="mt-1 text-slate-300">
              Nenhuma base de catálogo aplicada — origem do registro: montagem manual.
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
