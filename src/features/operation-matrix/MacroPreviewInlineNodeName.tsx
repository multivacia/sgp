import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import {
  normalizePreviewStructureNodeName,
  previewStructureNodeNameIsValid,
} from './operationMatrixPreviewEdits'
import { useRegisterInlineNameSaveHandler } from './MacroPreviewInlineNameSaveContext'
import { evaluateInlineNameSaveDraft } from './macroPreviewInlineNameSave'

type DragHandleProps = {
  setActivatorNodeRef: (element: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: SyntheticListenerMap | undefined
  activatorAttr?: string
}

type Props = {
  nodeId: string
  name: string
  onCommit: (nodeId: string, name: string) => void
  textClassName: string
  inputClassName: string
  dragHandle?: DragHandleProps
  onEditingChange?: (editing: boolean) => void
  initialEditing?: boolean
  isPendingCreate?: boolean
  onCancelPendingCreate?: (nodeId: string) => void
}

const inlineNameActionButtonClass =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/12 bg-white/[0.03] text-xs font-semibold text-slate-300 outline-none transition hover:border-white/18 hover:bg-white/[0.06] focus-visible:border-sgp-gold/35 focus-visible:ring-2 focus-visible:ring-sgp-gold/30'

export function MacroPreviewInlineNodeName({
  nodeId,
  name,
  onCommit,
  textClassName,
  inputClassName,
  dragHandle,
  onEditingChange,
  initialEditing = false,
  isPendingCreate = false,
  onCancelPendingCreate,
}: Props) {
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const initialEditAppliedRef = useRef(false)
  const draftRef = useRef(name)
  const committedNameRef = useRef(name)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [error, setError] = useState<string | null>(null)

  draftRef.current = draft
  committedNameRef.current = name

  const setEditingState = (next: boolean) => {
    setEditing(next)
    onEditingChange?.(next)
  }

  useEffect(() => {
    if (!editing) {
      setDraft(name)
      setError(null)
    }
  }, [editing, name])

  useEffect(() => {
    if (!initialEditing || initialEditAppliedRef.current) return
    initialEditAppliedRef.current = true
    setDraft(name)
    setError(null)
    setEditingState(true)
  }, [initialEditing, name])

  const stopDragOnControl = (event: PointerEvent) => {
    event.stopPropagation()
  }

  const cancelEdit = () => {
    if (isPendingCreate) {
      onCancelPendingCreate?.(nodeId)
      return
    }
    setDraft(name)
    setError(null)
    setEditingState(false)
  }

  const commitEdit = () => {
    if (!previewStructureNodeNameIsValid(draft)) {
      setError('Informe um nome.')
      return
    }
    const normalized = normalizePreviewStructureNodeName(draft)
    if (normalized === normalizePreviewStructureNodeName(name)) {
      setError(null)
      setEditingState(false)
      return
    }
    onCommit(nodeId, normalized)
    setError(null)
    setEditingState(false)
  }

  const inlineNameSaveHandler = useMemo(
    () =>
      editing
        ? {
            nodeId,
            tryCommitForSave: () => {
              const currentDraft = draftRef.current
              const currentName = committedNameRef.current
              const validation = evaluateInlineNameSaveDraft(currentDraft, currentName)
              if (!validation.ok) {
                setError(validation.message)
                return { ok: false as const, message: validation.message, nodeId }
              }
              const normalized = normalizePreviewStructureNodeName(currentDraft)
              if (normalized === normalizePreviewStructureNodeName(currentName)) {
                setError(null)
                setEditingState(false)
                return { ok: true as const }
              }
              onCommit(nodeId, normalized)
              setError(null)
              setEditingState(false)
              return { ok: true as const }
            },
            focusInvalidDraft: () => {
              inputRef.current?.focus()
            },
          }
        : null,
    [editing, nodeId, onCommit],
  )

  useRegisterInlineNameSaveHandler(inlineNameSaveHandler)

  const openEdit = () => {
    setDraft(name)
    setError(null)
    setEditingState(true)
  }

  if (!editing) {
    return (
      <span
        ref={dragHandle?.setActivatorNodeRef}
        {...(dragHandle?.activatorAttr ? { [dragHandle.activatorAttr]: '' } : {})}
        className={[textClassName, dragHandle ? 'cursor-grab touch-none active:cursor-grabbing' : ''].join(
          ' ',
        )}
        {...(dragHandle?.attributes ?? {})}
        {...(dragHandle?.listeners ?? {})}
        onDoubleClick={(event) => {
          event.stopPropagation()
          openEdit()
        }}
        title="Duplo clique para editar o nome"
      >
        {name}
      </span>
    )
  }

  return (
    <span className="flex min-w-0 max-w-full flex-col gap-1" onPointerDown={stopDragOnControl}>
      <span className="flex min-w-0 max-w-full items-start gap-1.5">
        <input
          ref={inputRef}
          type="text"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          if (error) setError(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitEdit()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            cancelEdit()
          }
        }}
        onPointerDown={stopDragOnControl}
        autoFocus
        aria-label="Editar nome"
        aria-invalid={error != null}
        aria-describedby={error ? errorId : undefined}
        className={[
          inputClassName,
          'box-border min-w-0 flex-1 rounded border px-2 py-1 outline-none ring-sgp-gold/40 focus-visible:ring-2',
          error
            ? 'border-rose-400/50 bg-rose-500/10 text-rose-50'
            : 'border-white/15 bg-sgp-void/90 text-slate-100',
        ].join(' ')}
      />
      <span className="inline-flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={commitEdit}
          onPointerDown={stopDragOnControl}
          aria-label="Salvar nome"
          className={inlineNameActionButtonClass}
        >
          ✓
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          onPointerDown={stopDragOnControl}
          aria-label="Cancelar edição do nome"
          className={inlineNameActionButtonClass}
        >
          ✕
        </button>
      </span>
      </span>
      {error ? (
        <span id={errorId} className="text-[11px] text-rose-300">
          {error}
        </span>
      ) : null}
    </span>
  )
}
