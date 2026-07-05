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
}

export function WeeklyAgendaCell(props: WeeklyAgendaCellProps) {
  const droppableId = dragCellId(props.collaboratorId, props.plannedDate)
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div
      ref={setNodeRef}
      data-testid={`weekly-agenda-cell-drop-${props.collaboratorId}-${props.plannedDate}`}
      data-drag-over={isOver ? 'true' : 'false'}
      className={[
        props.className,
        'rounded-md transition-colors duration-75',
        isOver
          ? 'bg-sgp-gold/[0.09] shadow-[inset_0_0_0_1.5px_rgba(201,162,39,0.5)]'
          : '',
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
