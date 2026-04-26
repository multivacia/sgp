/**
 * Compatibilidade — a persistência real está em `nova-esteira-drafts-repository` e fábrica.
 */

export {
  listarRascunhosNovaEsteira as listRascunhosNovaEsteira,
} from './nova-esteira-drafts-repository'

export type { NovaEsteiraRascunhoPersistido } from './nova-esteira-persistido'
