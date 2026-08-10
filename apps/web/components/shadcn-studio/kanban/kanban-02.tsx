'use client'

import type { ComponentProps } from 'react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay
} from '@/components/ui/kanban'

import { cn } from '@/lib/utils'

type Priority = 'low' | 'medium' | 'high'
type QuadrantId = 'urgentImportant' | 'notUrgentImportant' | 'notUrgentNotImportant'

interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  assignee: {
    name: string
    avatar: string
    initials: string
  }
}

const QUADRANT_META: Record<QuadrantId, { title: string; accent: string; surface: string }> = {
  urgentImportant: {
    title: 'Urgent & Important',
    accent: 'bg-destructive',
    surface: 'border-destructive/40 bg-destructive/10'
  },
  notUrgentImportant: {
    title: 'Not Urgent & Important',
    accent: 'bg-sky-600 dark:bg-sky-400',
    surface: 'border-sky-600/40 bg-sky-600/10 dark:border-sky-400/40 dark:bg-sky-400/10'
  },
  notUrgentNotImportant: {
    title: 'Not Urgent & Not Important',
    accent: 'bg-gray-500',
    surface: 'border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-950/20'
  }
}

const PRIORITY_META: Record<
  Priority,
  { label: string; variant: ComponentProps<typeof Badge>['variant']; className: string }
> = {
  high: { label: 'High', variant: 'destructive', className: 'border-transparent' },
  medium: {
    label: 'Medium',
    variant: 'secondary',
    className: 'bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
  },
  low: { label: 'Low', variant: 'outline', className: 'text-muted-foreground' }
}

const INITIAL_COLUMNS: Record<QuadrantId, Task[]> = {
  urgentImportant: [
    {
      id: 'q1-task-1',
      title: 'Restore payment webhook',
      description: 'Retries are failing for renewal events.',
      priority: 'high',
      assignee: {
        name: 'Alex Johnson',
        avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
        initials: 'AJ'
      }
    },
    {
      id: 'q1-task-2',
      title: 'Fix invite permissions',
      description: 'Admins cannot approve pending users.',
      priority: 'high',
      assignee: {
        name: 'Sarah Chen',
        avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
        initials: 'SC'
      }
    }
  ],
  notUrgentImportant: [
    {
      id: 'q2-task-1',
      title: 'Plan analytics rollout',
      description: 'Define events for activation reports.',
      priority: 'medium',
      assignee: {
        name: 'Emma Wilson',
        avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
        initials: 'EW'
      }
    },
    {
      id: 'q2-task-2',
      title: 'Refine billing copy',
      description: 'Clarify plan limits and trial states.',
      priority: 'low',
      assignee: {
        name: 'Michael Rodriguez',
        avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png',
        initials: 'MR'
      }
    }
  ],
  notUrgentNotImportant: [
    {
      id: 'q4-task-1',
      title: 'Archive old mockups',
      description: 'Move unused explorations to storage.',
      priority: 'low',
      assignee: {
        name: 'James Brown',
        avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
        initials: 'JB'
      }
    }
  ]
}

interface TaskCardProps extends Omit<ComponentProps<typeof KanbanItem>, 'value' | 'children'> {
  task: Task
  isOverlay?: boolean
}

function TaskCard({ task, isOverlay, ...props }: TaskCardProps) {
  const priority = PRIORITY_META[task.priority]

  const card = (
    <Card
      size='sm'
      className={cn(
        'bg-background shadow-xs transition-shadow',
        !isOverlay && 'hover:shadow-sm',
        isOverlay && 'rotate-1 shadow-lg'
      )}
    >
      <CardContent className='space-y-2'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0 space-y-0.5'>
            <h3 className='line-clamp-1 text-sm font-medium'>{task.title}</h3>
            <p className='text-muted-foreground line-clamp-2 text-xs leading-snug'>{task.description}</p>
          </div>
          <Avatar className='size-6 shrink-0 border'>
            <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
            <AvatarFallback className='text-xs'>{task.assignee.initials}</AvatarFallback>
          </Avatar>
        </div>
        <Badge variant={priority.variant} className={cn('h-5 rounded px-1.5 text-xs', priority.className)}>
          {priority.label}
        </Badge>
      </CardContent>
    </Card>
  )

  return (
    <KanbanItem value={task.id} {...props}>
      {isOverlay ? card : <KanbanItemHandle>{card}</KanbanItemHandle>}
    </KanbanItem>
  )
}

interface QuadrantColumnProps extends Omit<ComponentProps<typeof KanbanColumn>, 'children' | 'value'> {
  value: QuadrantId
  tasks: Task[]
  isOverlay?: boolean
}

function QuadrantColumn({ value, tasks, isOverlay, ...props }: QuadrantColumnProps) {
  const meta = QUADRANT_META[value]

  return (
    <KanbanColumn value={value} {...props}>
      <div className={cn('flex h-full flex-col rounded-xl border p-2', meta.surface)}>
        <div className='bg-background/80 mb-2 rounded-lg border px-3 py-2 shadow-xs'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex min-w-0 items-center gap-2'>
              <span className={cn('size-2 shrink-0 rounded-full', meta.accent)} />
              <h2 className='truncate text-sm font-semibold'>{meta.title}</h2>
            </div>
            <Badge variant='outline' className='h-5 rounded-full px-1.5 text-xs tabular-nums'>
              {tasks.length}
            </Badge>
          </div>
        </div>
        <KanbanColumnContent value={value} className='min-h-57 gap-2'>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} isOverlay={isOverlay} />
          ))}
        </KanbanColumnContent>
      </div>
    </KanbanColumn>
  )
}

const KanbanDemoColored = () => {
  const [columns, setColumns] = useState<Record<string, Task[]>>(INITIAL_COLUMNS)

  return (
    <div className='space-y-4 overflow-x-auto'>
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={item => item.id}
        className='mx-auto w-full max-w-4xl'
      >
        <KanbanBoard className='grid auto-rows-fr grid-cols-[repeat(3,minmax(15rem,1fr))] gap-3'>
          {(Object.keys(QUADRANT_META) as QuadrantId[]).map(columnId => (
            <QuadrantColumn key={columnId} value={columnId} tasks={columns[columnId] ?? []} />
          ))}
        </KanbanBoard>
        <KanbanOverlay>
          {({ value, variant }) => {
            const activeValue = String(value)

            if (variant === 'column') {
              return <QuadrantColumn value={activeValue as QuadrantId} tasks={columns[activeValue] ?? []} isOverlay />
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

export default KanbanDemoColored
