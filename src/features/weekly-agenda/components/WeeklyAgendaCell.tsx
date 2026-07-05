/* eslint-disable react-hooks/refs -- @dnd-kit useDroppable/useSortable */
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import { dragCellId } from '../weeklyAgendaDnD'

type WeeklyAgendaCellProps = {
  collaboratorId: string
  plannedDate: string
  sortableIds: string[]
  children: ReactNode
  className?: string
  tapPlaceActive?: boolean
  onTapPlace?: () => void
}

export function WeeklyAgendaCell(props: WeeklyAgendaCellProps) {
  const droppableId = dragCellId(props.collaboratorId, props.plannedDate)
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const highlight = isOver || props.tapPlaceActive

  return (
    <div
      ref={setNodeRef}
      data-testid={`weekly-agenda-cell-drop-${props.collaboratorId}-${props.plannedDate}`}
      data-drag-over={isOver ? 'true' : 'false'}
      data-tap-place-active={props.tapPlaceActive ? 'true' : 'false'}
      role={props.tapPlaceActive ? 'button' : undefined}
      tabIndex={props.tapPlaceActive ? 0 : undefined}
      onClick={
        props.tapPlaceActive
          ? (e) => {
              e.stopPropagation()
              props.onTapPlace?.()
            }
          : undefined
      }
      onKeyDown={
        props.tapPlaceActive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                props.onTapPlace?.()
              }
            }
          : undefined
      }
      className={[
        props.className,
        'rounded-md transition-colors duration-75',
        highlight
          ? 'bg-sgp-gold/[0.09] shadow-[inset_0_0_0_1.5px_rgba(201,162,39,0.5)]'
          : '',
        props.tapPlaceActive ? 'cursor-pointer' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <SortableContext items={props.sortableIds} strategy={verticalListSortingStrategy}>
        {props.children}
      </SortableContext>
    </div>
  )
}
