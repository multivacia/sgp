import {
  inferShellFunctionFromPath,
  longestNavItemMatchForPath,
  sectionDisplayLabel,
  type ShellNavItem,
} from './shell/app-nav-config'

/** Títulos exibidos no shell conforme a rota autenticada */
export function pageTitleForPath(pathname: string): string {
  if (pathname.startsWith('/app/backlog')) return 'Backlog Operacional'
  if (pathname.startsWith('/app/nova-esteira')) return 'Nova Esteira'
  if (/\/app\/esteiras\/[^/]+\/alterar/.test(pathname)) return 'Alterar esta esteira'
  if (pathname.startsWith('/app/esteiras/')) return 'Detalhe da Esteira'
  if (pathname.startsWith('/app/importar-os')) return 'Nova esteira por documento'
  if (pathname.startsWith('/app/dashboard')) return 'Dashboard operacional'
  if (pathname.startsWith('/app/colaboradores')) return 'Colaboradores operacionais'
  if (pathname.startsWith('/app/configuracoes-operacionais')) {
    return 'Configurações operacionais'
  }
  if (pathname.startsWith('/app/equipes/nova')) return 'Nova equipe'
  if (pathname.startsWith('/app/equipes')) return 'Equipes'
  if (pathname.startsWith('/app/gestao/jornada-colaborador')) return 'Jornada por colaborador'
  if (pathname.startsWith('/app/usuarios/trilha')) return 'Trilha administrativa'
  if (pathname.startsWith('/app/permissoes-por-papel')) return 'Permissões por papel'
  if (pathname.startsWith('/app/usuarios')) return 'Usuários de acesso'
  if (pathname.startsWith('/app/matrizes-operacao/nova')) return 'Nova matriz de operação'
  if (pathname.startsWith('/app/matrizes-operacao')) return 'Matrizes de operação'
  if (pathname.startsWith('/app/meu-trabalho')) return 'Meu Trabalho'
  if (pathname.startsWith('/app/minhas-atividades')) return 'Minhas Atividades'
  if (pathname.startsWith('/app/chamados')) return 'Chamados'
  if (pathname.startsWith('/app/jornada')) return 'Jornada do colaborador'
  if (pathname.startsWith('/app/apontamento')) return 'Apontamento'
  if (pathname.startsWith('/app/conta/alterar-senha')) return 'Alterar senha'
  if (pathname === '/app' || pathname === '/app/') return 'Início'
  return 'SGP Web'
}

/** Ajustes pontuais para segmento curto (coerência com a sidebar sem repetir o título da página). */
const SHELL_SEGMENT_BY_ROUTE: Partial<Record<string, string>> = {
  '/app/backlog': 'Painel',
  '/app/importar-os': 'Documento',
}

function shortShellSegmentFromNavItem(item: ShellNavItem): string {
  const byRoute = SHELL_SEGMENT_BY_ROUTE[item.to]
  if (byRoute) return byRoute

  const label = item.label.trim()

  const de = /^(.+?)\s+de\s+/i.exec(label)
  if (de && de[1].length >= 2) return de[1].trim()

  const por = /^(.+?)\s+por\s+/i.exec(label)
  if (por && por[1].length >= 2) return por[1].trim()

  /* Só enxuga por primeira palavra quando o rótulo do menu fica longo demais para o shell. */
  if (label.length > 24 && label.includes(' ')) {
    return label.split(/\s+/)[0] ?? label
  }

  return label
}

function shellContextFromNav(pathname: string): string | null {
  const item = longestNavItemMatchForPath(pathname)
  if (!item) return null
  const area = sectionDisplayLabel(item.section)
  const seg = shortShellSegmentFromNavItem(item)
  return `${area} · ${seg}`
}

/**
 * Contexto curto para o cabeçalho do shell (área + ramo), sem duplicar o título principal da página.
 */
export function shellContextForPath(pathname: string): string {
  const fromNav = shellContextFromNav(pathname)
  if (fromNav) return fromNav

  const path = pathname.split('?')[0] ?? pathname

  if (path === '/app' || path === '/app/') {
    return 'Gestão · Início'
  }

  if (/\/app\/esteiras\/[^/]+\/alterar/.test(path)) {
    return 'Gestão · Esteiras'
  }
  if (path.startsWith('/app/esteiras/')) {
    return 'Gestão · Esteiras'
  }

  if (path.startsWith('/app/apontamento')) {
    return 'Colaborador · Apontamento'
  }

  if (path.startsWith('/app/gestao/apontamento')) {
    return 'Gestão · Apontamento'
  }

  const fn = inferShellFunctionFromPath(pathname)
  return fn === 'colaborador' ? 'Colaborador · App' : 'Gestão · App'
}
