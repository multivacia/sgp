/** Marca do SGP+ (logo Bravo no selo branco, como na V1) + "SGP+ V2". */
export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex items-center justify-center rounded-[10px] bg-white shadow-sm ring-1 ring-black/5 ${grande ? 'h-14 px-2' : 'h-9 px-1.5'}`}>
        <img src={`${import.meta.env.BASE_URL}brand/bravo-logo.png`} alt="Bravo" className={grande ? 'h-11 w-auto' : 'h-7 w-auto'} />
      </span>
      <span className={`font-display font-extrabold tracking-tight text-white ${grande ? 'text-3xl' : 'text-lg'}`}>
        SGP+ <span className="rounded-md bg-gold px-1.5 py-0.5 align-middle text-[0.7em] font-bold text-navy">V2</span>
      </span>
    </span>
  )
}
