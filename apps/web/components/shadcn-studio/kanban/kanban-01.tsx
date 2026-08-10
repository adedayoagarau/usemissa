'use client'

import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay
} from '@/components/ui/kanban'

import { cn } from '@/lib/utils'
import { CalendarIcon, GripVerticalIcon } from "lucide-react"

type Priority = 'low' | 'medium' | 'high'
type ColumnId = 'todo' | 'inProgress' | 'done'

interface Task {
  id: string
  title: string
  priority: Priority
  dueDate: string
  label: string
}

const COLUMN_META: Record<ColumnId, { title: string; subtitle: string; accent: string }> = {
  todo: {
    title: 'Todo',
    subtitle: 'Next up',
    accent: 'bg-slate-400'
  },
  inProgress: {
    title: 'In Progress',
    subtitle: 'Being worked',
    accent: 'bg-blue-500'
  },
  done: {
    title: 'Done',
    subtitle: 'Completed',
    accent: 'bg-emerald-500'
  }
}

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500'
}

const INITIAL_COLUMNS: Record<ColumnId, Task[]> = {
  todo: [
    {
      id: 'task-1',
      title: 'Design onboarding flow',
      priority: 'high',
      dueDate: 'Jun 15',
      label: 'Product'
    },
    {
      id: 'task-2',
      title: 'Write API docs',
      priority: 'medium',
      dueDate: 'Jun 18',
      label: 'Docs'
    },
    {
      id: 'task-3',
      title: 'Define data schema',
      priority: 'low',
      dueDate: 'Jun 22',
      label: 'Backend'
    }
  ],
  inProgress: [
    {
      id: 'task-4',
      title: 'Implement auth module',
      priority: 'high',
      dueDate: 'Jun 14',
      label: 'Security'
    },
    {
      id: 'task-5',
      title: 'Build REST endpoints',
      priority: 'medium',
      dueDate: 'Jun 16',
      label: 'API'
    },
    {
      id: 'task-6',
      title: 'Dark mode support',
      priority: 'medium',
      dueDate: 'Jun 17',
      label: 'UI'
    }
  ],
  done: [
    {
      id: 'task-7',
      title: 'Project setup and scaffolding',
      priority: 'high',
      dueDate: 'Jun 01',
      label: 'Setup'
    },
    {
      id: 'task-8',
      title: 'Initial DB migrations',
      priority: 'low',
      dueDate: 'Jun 02',
      label: 'Database'
    }
  ]
}

interface TaskCardProps extends Omit<ComponentProps<typeof KanbanItem>, 'value' | 'children'> {
  task: Task
  isOverlay?: boolean
}

function TaskCard({ task, isOverlay, ...props }: TaskCardProps) {
  const card = (
    <div
      className={cn(
        'bg-background rounded-lg border p-3 shadow-xs transition-all',
        !isOverlay && 'hover:border-primary/30 hover:shadow-sm',
        isOverlay && 'ring-primary/20 rotate-1 shadow-lg ring-2'
      )}
    >
      <div className='mb-3 flex items-center justify-between gap-2'>
        <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium'>{task.label}</span>
        <span className='text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap tabular-nums'>
          <CalendarIcon className='size-3' />
          {task.dueDate}
        </span>
      </div>
      <div className='flex items-start gap-2.5'>
        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', PRIORITY_STYLES[task.priority])} />
        <p className='line-clamp-2 text-sm leading-snug font-medium'>{task.title}</p>
      </div>
    </div>
  )

  return (
    <KanbanItem value={task.id} {...props}>
      {isOverlay ? card : <KanbanItemHandle>{card}</KanbanItemHandle>}
    </KanbanItem>
  )
}

interface TaskColumnProps extends Omit<ComponentProps<typeof KanbanColumn>, 'children' | 'value'> {
  value: ColumnId
  tasks: Task[]
  isOverlay?: boolean
}

function TaskColumn({ value, tasks, isOverlay, ...props }: TaskColumnProps) {
  const meta = COLUMN_META[value]

  return (
    <KanbanColumn value={value} {...props}>
      <div className='bg-muted flex h-full flex-col rounded-xl border p-2'>
        <div className='flex items-center justify-between px-3 pt-2 pb-4'>
          <div className='flex min-w-0 items-center gap-2'>
            <h3 className='text-sm font-semibold'>{meta.title}</h3>
            <Badge variant='outline'>{tasks.length}</Badge>
          </div>
          <KanbanColumnHandle
            render={handleProps => (
              <Button {...handleProps} size='icon-xs' variant='ghost' aria-label={`Move ${meta.title} column`}>
                <GripVerticalIcon
                />
              </Button>
            )}
          />
        </div>
        <KanbanColumnContent value={value} className='gap-2.5'>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} isOverlay={isOverlay} />
          ))}
        </KanbanColumnContent>
      </div>
    </KanbanColumn>
  )
}

const KanbanDemo = () => {
  const [columns, setColumns] = useState<Record<string, Task[]>>(INITIAL_COLUMNS)

  return (
    <div className='space-y-4 overflow-x-auto'>
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={item => item.id}
        className='mx-auto w-full max-w-4xl'
      >
        <KanbanBoard className='grid auto-rows-fr grid-cols-[repeat(3,minmax(14rem,1fr))] gap-3'>
          {Object.entries(columns).map(([columnId, tasks]) => (
            <TaskColumn key={columnId} value={columnId as ColumnId} tasks={tasks} />
          ))}
        </KanbanBoard>
        <KanbanOverlay>
          {({ value, variant }) => {
            const activeValue = String(value)

            if (variant === 'column') {
              return <TaskColumn value={activeValue as ColumnId} tasks={columns[activeValue] ?? []} isOverlay />
            }

            const task = Object.values(columns)
              .flat()
              .find(t => t.id === activeValue)

            return task ? <TaskCard task={task} isOverlay /> : null
          }}
        </KanbanOverlay>
      </Kanban>

      <p className='text-muted-foreground text-center text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://reui.io/components/kanban'
          target='_blank'
          rel='noopener noreferrer'
        >
          ReUI
        </a>
      </p>
    </div>
  )
}

export default KanbanDemo
