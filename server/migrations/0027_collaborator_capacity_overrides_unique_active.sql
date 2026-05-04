-- CAP-HF1.2 — Um override ativo (não apagado) por colaborador, para upsert ON CONFLICT estável.

CREATE UNIQUE INDEX IF NOT EXISTS uq_collaborator_capacity_overrides_active_collaborator
ON public.collaborator_capacity_overrides (collaborator_id)
WHERE deleted_at IS NULL
  AND is_active = true;
