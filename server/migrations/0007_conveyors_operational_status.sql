-- Pipeline operacional oficial: status + conclusão (backlog, KPIs, filtros).
-- Regra de negócio: ao sair de CONCLUIDA, completed_at deve ser NULL (limpar no serviço de transição futuro).

ALTER TABLE conveyors
  ADD COLUMN operational_status VARCHAR(32) NOT NULL DEFAULT 'NO_BACKLOG'
    CONSTRAINT chk_conveyors_operational_status CHECK (
      operational_status IN (
        'NO_BACKLOG',
        'EM_REVISAO',
        'PRONTA_LIBERAR',
        'EM_PRODUCAO',
        'CONCLUIDA'
      )
    ),
  ADD COLUMN completed_at TIMESTAMPTZ NULL;

CREATE INDEX idx_conveyors_operational_status
  ON conveyors (operational_status)
  WHERE deleted_at IS NULL;

-- timestamptz::date não é IMMUTABLE (depende do timezone da sessão).
-- AT TIME ZONE 'UTC' fixa o "dia" em UTC para o índice; consultas por "hoje" no app usam intervalo em timestamptz.
CREATE INDEX idx_conveyors_completed_at_day
  ON conveyors (((completed_at AT TIME ZONE 'UTC')::date))
  WHERE deleted_at IS NULL AND completed_at IS NOT NULL;

COMMENT ON COLUMN conveyors.operational_status IS
  'Estágio no pipeline: NO_BACKLOG | EM_REVISAO | PRONTA_LIBERAR | EM_PRODUCAO | CONCLUIDA';
COMMENT ON COLUMN conveyors.completed_at IS
  'Momento em que a esteira foi concluída; obrigatório para contagem “Concluídas hoje” quando status = CONCLUIDA.';
