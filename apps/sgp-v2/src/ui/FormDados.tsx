import { useState } from 'react'
import { PRIORIDADES, nomeSugerido, placaLimpa, type DadosEsteira } from '../domain/dadosEsteira'
import { prazoPara } from '../domain/novaEsteira'

type Parte = 'carro' | 'quando' | 'tudo'
type Props = {
  dados: DadosEsteira
  onChange: (d: DadosEsteira) => void
  parte: Parte
  /** Nome da matriz, para sugerir o nome da esteira. */
  matriz?: string
  nomeResponsavel: string
  onEscolherResponsavel: () => void
}

const ATALHOS = [
  ['hoje', 'Hoje'],
  ['amanha', 'Amanhã'],
  ['sexta', 'Até sexta'],
  ['data', 'Escolher data'],
] as const
type Atalho = (typeof ATALHOS)[number][0]

/** Dados básicos da esteira (os mesmos da V1), em telas grandes de toque. Usado na criação e na alteração. */
export function FormDados({ dados, onChange, parte, matriz = '', nomeResponsavel, onEscolherResponsavel }: Props) {
  const [atalho, setAtalho] = useState<Atalho>(() => (['hoje', 'amanha', 'sexta'] as const).find((k) => prazoPara(k) === dados.prazoEstimado) ?? 'data')
  const set = (p: Partial<DadosEsteira>) => onChange({ ...dados, ...p })
  const carro = parte !== 'quando'
  const quando = parte !== 'carro'
  return (
    <div className="flex flex-col gap-4">
      {carro ? (
        <>
          <label className="flex flex-col gap-2 font-bold">
            Placa
            <input value={dados.placa} onChange={(e) => set({ placa: placaLimpa(e.target.value) })} placeholder="ABC1D23" autoCapitalize="characters" className="field font-display text-3xl tracking-widest" />
          </label>
          <label className="flex flex-col gap-2 font-bold">
            Veículo
            <input value={dados.veiculo} onChange={(e) => set({ veiculo: e.target.value })} placeholder="Ex.: Gol GTI" className="field" />
          </label>
          <label className="flex flex-col gap-2 font-bold">
            Modelo / versão (opcional)
            <input value={dados.modeloVersao} onChange={(e) => set({ modeloVersao: e.target.value })} placeholder="Ex.: 1.0 · 4 portas" className="field" />
          </label>
          <label className="flex flex-col gap-2 font-bold">
            Cliente (opcional)
            <input value={dados.cliente} onChange={(e) => set({ cliente: e.target.value })} className="field" />
          </label>
          <label className="flex flex-col gap-2 font-bold">
            Nome da esteira
            <input value={dados.nome} onChange={(e) => set({ nome: e.target.value })} placeholder={nomeSugerido(dados, matriz) || 'Ex.: Gol GTI · ABC1D23'} className="field" />
            <span className="text-sm font-normal text-muted">{dados.nome.trim() ? 'Nome escolhido por você.' : 'Em branco = usa o sugerido (veículo · placa).'}</span>
          </label>
        </>
      ) : null}

      {quando ? (
        <>
          <span className="text-lg font-bold">Prazo</span>
          <div className="grid grid-cols-2 gap-2.5">
            {ATALHOS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={atalho === k}
                onClick={() => {
                  setAtalho(k)
                  if (k !== 'data') set({ prazoEstimado: prazoPara(k) })
                }}
                className={`min-h-16 rounded-2xl text-lg font-bold ${atalho === k ? 'bg-ink text-white' : 'border-2 border-line bg-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {atalho === 'data' ? (
            <label className="flex flex-col gap-2 font-bold">
              Data de entrega
              <input type="date" value={dados.prazoEstimado} onChange={(e) => set({ prazoEstimado: e.target.value })} className="field" />
            </label>
          ) : null}

          <span className="mt-2 text-lg font-bold">Prioridade</span>
          <div className="grid grid-cols-3 gap-2.5" role="group" aria-label="Prioridade">
            {PRIORIDADES.map((p) => (
              <button key={p.v} type="button" aria-pressed={dados.prioridade === p.v} onClick={() => set({ prioridade: p.v })} className={`min-h-14 rounded-2xl text-lg font-bold ${dados.prioridade === p.v ? (p.v === 'alta' ? 'bg-late text-white' : 'bg-ink text-white') : 'border-2 border-line bg-white'}`}>
                {p.label}
              </button>
            ))}
          </div>

          <span className="mt-2 text-lg font-bold">Responsável pela esteira</span>
          <button type="button" onClick={onEscolherResponsavel} className="flex min-h-14 items-center justify-between rounded-2xl border-2 border-line-strong bg-white px-4 text-lg font-bold">
            <span>{nomeResponsavel || 'Escolher'}</span>
            <span className="text-sm underline">Trocar</span>
          </button>

          <label className="mt-2 flex flex-col gap-2 text-lg font-bold">
            Observações (opcional)
            <textarea value={dados.observacoes} onChange={(e) => set({ observacoes: e.target.value })} rows={3} placeholder="Contexto do pedido" className="rounded-2xl border-2 border-line bg-white p-3 text-lg font-normal" />
          </label>
        </>
      ) : null}
    </div>
  )
}
