import bravoLogoSidebar from '../../assets/bravo-logo-sidebar.png'
import { BRAVO_HOME_URL } from '../../lib/external-links'

/** Link do logo — ~55% da largura útil do sidebar expandido (18rem menos padding). */
export function bravoSidebarLogoLinkClass(): string {
  return [
    'flex w-[148px] min-h-14 max-w-[58%] items-center justify-center',
    'rounded-[10px] bg-white px-2 py-1.5',
    'shadow-sm ring-1 ring-black/[0.06]',
    'transition hover:ring-sgp-gold/30',
  ].join(' ')
}

/** Imagem — área útil maior, sem margem excessiva do asset original. */
export function bravoSidebarLogoImageClass(): string {
  return 'block h-auto w-full max-h-[50px] max-w-[142px] object-contain'
}

/** Classes do wrapper: visível no drawer mobile; oculto no rail desktop (mesma regra da marca SGP). */
export function bravoSidebarBrandWrapperClass(rail: boolean): string {
  return rail ? 'mb-3 flex justify-center md:hidden' : 'mb-3 flex justify-center'
}

type Props = {
  /** Sidebar recolhido em desktop (`collapsed`). */
  rail: boolean
}

export function BravoSidebarBrand({ rail }: Props) {
  return (
    <div className={bravoSidebarBrandWrapperClass(rail)}>
      <a
        href={BRAVO_HOME_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir home page da Bravo"
        className={bravoSidebarLogoLinkClass()}
      >
        <img
          src={bravoLogoSidebar}
          alt="Bravo"
          width={142}
          height={50}
          className={bravoSidebarLogoImageClass()}
        />
      </a>
    </div>
  )
}
