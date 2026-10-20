type Props = {
  /** Há próxima página (`nextCursor` não nulo). */
  hasMore: boolean
  loading: boolean
  /** Erro ao carregar a próxima página; os itens já carregados permanecem. */
  error: string | null
  onLoadMore: () => void
  /** Classes do botão (cada tela mantém seu estilo). */
  buttonClassName: string
  errorClassName?: string
  testId?: string
}

/**
 * Rodapé de lista paginada por cursor: "Carregar mais" ou, após falha, a mensagem com
 * "Tentar novamente" (mesmo cursor). Desabilitado durante o carregamento.
 */
export function LoadMoreFooter({
  hasMore,
  loading,
  error,
  onLoadMore,
  buttonClassName,
  errorClassName = 'text-xs text-rose-200',
  testId = 'load-more-footer',
}: Props) {
  if (!hasMore && !error) return null
  return (
    <div data-testid={testId} className="flex flex-col items-stretch gap-2 pt-3">
      {error ? (
        <p role="alert" className={errorClassName}>
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={buttonClassName}
        disabled={loading}
        aria-busy={loading}
        onClick={onLoadMore}
      >
        {loading ? 'Carregando…' : error ? 'Tentar novamente' : 'Carregar mais'}
      </button>
    </div>
  )
}
