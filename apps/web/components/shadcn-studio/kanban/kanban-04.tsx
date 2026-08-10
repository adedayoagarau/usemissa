'use client'

import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { CalendarClockIcon, GripVerticalIcon } from "lucide-react"

type ColumnId = 'inProgress' | 'review' | 'done'

interface Task {
  id: string
  code: string
  title: string
  priority: 'low' | 'medium' | 'high'
  description?: string
  assignee?: string
  assigneeAvatar?: string
  dueDate?: string
  estimate?: string
  labels?: string[]
}

const COLUMN_META: Record<ColumnId, { title: string; eyebrow: string; accent: string; dot: string }> = {
  inProgress: {
    title: 'Building',
    eyebrow: 'In flight',
    accent: 'from-amber-600/20 via-amber-600/5 dark:from-amber-400/20 dark:via-amber-400/5 to-transparent',
    dot: 'bg-amber-500'
  },
  review: {
    title: 'QA Review',
    eyebrow: 'Validate',
    accent: 'from-violet-500/20 via-violet-500/5 to-transparent',
    dot: 'bg-violet-500'
  },
  done: {
    title: 'Shipped',
    eyebrow: 'Released',
    accent: 'from-green-600/20 via-green-600/5 dark:from-green-400/20 dark:via-green-400/5 to-transparent',
    dot: 'bg-green-600 dark:bg-green-400'
  }
}

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  low: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300',
  medium:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
  high: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
}

const INITIAL_COLUMNS: Record<ColumnId, Task[]> = {
  inProgress: [
    {
      id: '4',
      code: 'DS-31',
      title: 'Refresh component tokens',
      priority: 'high',
      description: 'Reconcile radius, shadow, and neutral color tokens across the workspace.',
      assignee: 'Emma Wilson',
      assigneeAvatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
      dueDate: 'Aug 25',
      estimate: '8 pts',
      labels: ['Design system']
    },
    {
      id: '5',
      code: 'UI-19',
      title: 'Implement dark mode polish',
      priority: 'medium',
      description: 'Audit contrast, chart colors, and empty states for dark theme parity.',
      assignee: 'David Kim',
      assigneeAvatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
      dueDate: 'Aug 28',
      estimate: '5 pts',
      labels: ['Theme', 'A11y']
    }
  ],
  review: [
    {
      id: '6',
      code: 'QA-04',
      title: 'Run invite flow regression',
      priority: 'medium',
      description: 'Verify workspace invites, role changes, and expired token states.',
      assignee: 'Nina Patel',
      assigneeAvatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
      dueDate: 'Sep 06',
      estimate: '3 pts',
      labels: ['QA']
    }
  ],
  done: [
    {
      id: '7',
      code: 'OPS-01',
      title: 'Set up preview pipeline',
      priority: 'high',
      description: 'Ship isolated preview builds for every registry component change.',
      assignee: 'Aron Thompson',
      assigneeAvatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png',
      dueDate: 'Sep 25',
      estimate: '5 pts',
      labels: ['CI']
    },
    {
      id: '8',
      code: 'GIT-02',
      title: 'Initial registry import',
      priority: 'low',
      description: 'Create the first grouped component entries with preview metadata.',
      assignee: 'James Brown',
      assigneeAvatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
      dueDate: 'Sep 20',
      estimate: '1 pt',
      labels: ['Registry']
    }
  ]
}

interface TaskCardProps extends Omit<ComponentProps<typeof KanbanItem>, 'value' | 'children'> {
  task: Task
  isOverlay?: boolean
}

function TaskCard({ task, isOverlay, ...props }: TaskCardProps) {
  const initials = task.assignee
    ?.split(' ')
    .map(part => part[0])
    .join('')

  const cardContent = (
    <div
      className={cn(
        'bg-card text-card-foreground relative overflow-hidden rounded-lg border p-3 shadow-xs transition-shadow',
        !isOverlay && 'hover:shadow-sm'
      )}
    >
      <div className='space-y-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 space-y-1'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase'>
              <span>{task.code}</span>
              {task.estimate && (
                <>
                  <span className='size-1 rounded-full bg-current opacity-40' />
                  <span>{task.estimate}</span>
                </>
              )}
            </div>
            <h3 className='line-clamp-2 text-sm leading-snug font-medium'>{task.title}</h3>
          </div>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs leading-4 font-medium capitalize',
              PRIORITY_STYLES[task.priority]
            )}
          >
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>{task.description}</p>
        )}

        {!!task.labels?.length && (
          <div className='flex flex-wrap gap-1.5'>
            {task.labels.map(label => (
              <span key={label} className='bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-medium'>
                {label}
              </span>
            ))}
          </div>
        )}

        <div className='flex items-center justify-between gap-3 border-t pt-3'>
          {task.assignee && (
            <div className='flex min-w-0 items-center gap-2'>
              <Avatar className='size-6 border'>
                <AvatarImage src={task.assigneeAvatar} />
                <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
              </Avatar>
              <span className='text-muted-foreground line-clamp-1 text-xs'>{task.assignee}</span>
            </div>
          )}
          {task.dueDate && (
            <time className='text-muted-foreground flex shrink-0 items-center gap-1 text-xs whitespace-nowrap tabular-nums'>
              <CalendarClockIcon className='size-3' />
              {task.dueDate}
            </time>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <KanbanItem value={task.id} {...props}>
      {isOverlay ? cardContent : <KanbanItemHandle>{cardContent}</KanbanItemHandle>}
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
      <div className='bg-muted/50 flex flex-col rounded-xl border p-2 shadow-xs'>
        <div className={cn('mb-2 rounded-lg bg-linear-to-r p-3', meta.accent)}>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase'>
                <span className={cn('size-2 rounded-full', meta.dot)} />
                {meta.eyebrow}
              </div>
              <div className='flex items-center gap-2'>
                <h2 className='text-sm font-semibold'>{meta.title}</h2>
                <Badge variant='outline'>{tasks.length}</Badge>
              </div>
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
        </div>
        <KanbanColumnContent value={value} className='min-h-105 gap-2.5'>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} isOverlay={isOverlay} />
          ))}
        </KanbanColumnContent>
      </div>
    </KanbanColumn>
  )
}

const KanbanDemoModern = () => {
  const [columns, setColumns] = useState<Record<string, Task[]>>(INITIAL_COLUMNS)

  return (
    <div className='space-y-4 overflow-x-auto'>
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={item => item.id}
        className='mx-auto w-full max-w-4xl'
      >
        <KanbanBoard className='grid auto-rows-fr grid-cols-[repeat(3,minmax(16rem,1fr))] gap-3'>
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
    </div>
  )
}

export default KanbanDemoModern
