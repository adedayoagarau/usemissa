'use client'

import { useState } from 'react'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

import { cn } from '@/lib/utils'
import { GripVerticalIcon } from "lucide-react"

interface TaskItem {
  id: string
  title: string
  avatarSrc: string
  avatarFallback: string
}

const pendingTaskItems: TaskItem[] = [
  {
    id: 'pending-1',
    title: 'Design new company logo.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    avatarFallback: 'PG'
  },
  {
    id: 'pending-2',
    title: 'Finalize budget proposal.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
    avatarFallback: 'JD'
  },
  {
    id: 'pending-3',
    title: 'Schedule team meeting.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    avatarFallback: 'TC'
  },
  {
    id: 'pending-4',
    title: 'Update client database.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png',
    avatarFallback: 'ZV'
  },
  {
    id: 'pending-5',
    title: 'Plan marketing campaign.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    avatarFallback: 'KP'
  }
]

const completedTaskItems: TaskItem[] = [
  {
    id: 'completed-1',
    title: 'Launch new website.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png',
    avatarFallback: 'SP'
  },
  {
    id: 'completed-2',
    title: 'Prepare quarterly report.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-7.png',
    avatarFallback: 'KW'
  },
  {
    id: 'completed-3',
    title: 'Conduct employee training.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-8.png',
    avatarFallback: 'DP'
  },
  {
    id: 'completed-4',
    title: 'Organize office relocation.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    avatarFallback: 'TC'
  },
  {
    id: 'completed-5',
    title: 'Attend industry conference.',
    avatarSrc: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    avatarFallback: 'KP'
  }
]

type ColumnId = 'pending' | 'completed'

const columnTitleMap: Record<ColumnId, string> = {
  pending: 'Pending Tasks',
  completed: 'Completed Tasks'
}

const TaskRow = ({ task }: { task: TaskItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn('flex items-center justify-between gap-3 p-3', isDragging && 'bg-background z-20 rounded-md')}
    >
      <button
        type='button'
        aria-label={`Drag ${task.title}`}
        className='text-muted-foreground hover:text-foreground inline-flex items-center'
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className='size-4 cursor-grab' />
      </button>
      <p className='text-muted-foreground flex-1 text-[15px] sm:text-base'>{task.title}</p>
      <Avatar className='size-7 rounded-full'>
        <AvatarImage src={task.avatarSrc} alt={task.title} className='rounded-full' />
        <AvatarFallback className='text-[10px]'>{task.avatarFallback}</AvatarFallback>
      </Avatar>
    </div>
  )
}

const SortableTaskColumnsDemo = () => {
  const [pendingTasks, setPendingTasks] = useState<TaskItem[]>(pendingTaskItems)
  const [completedTasks, setCompletedTasks] = useState<TaskItem[]>(completedTaskItems)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const findContainer = (id: UniqueIdentifier): ColumnId | null => {
    const value = String(id)

    if (value === 'pending' || pendingTasks.some(task => task.id === value)) return 'pending'
    if (value === 'completed' || completedTasks.some(task => task.id === value)) return 'completed'

    return null
  }

  const getTaskById = (id: UniqueIdentifier) => {
    const value = String(id)

    return pendingTasks.find(task => task.id === value) ?? completedTasks.find(task => task.id === value) ?? null
  }

  const handlePendingChange = (newTasks: TaskItem[]) => {
    setPendingTasks(newTasks)

    toast.success('Pending tasks reordered successfully!', {
      description: newTasks.map((task, index) => `${index + 1}. ${task.title}`).join(', ')
    })
  }

  const handleCompletedChange = (newTasks: TaskItem[]) => {
    setCompletedTasks(newTasks)

    toast.success('Completed tasks reordered successfully!', {
      description: newTasks.map((task, index) => `${index + 1}. ${task.title}`).join(', ')
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      const sourceTasks = activeContainer === 'pending' ? pendingTasks : completedTasks
      const activeIndex = sourceTasks.findIndex(task => task.id === active.id)
      const overIndex = sourceTasks.findIndex(task => task.id === over.id)

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return

      const reorderedTasks = arrayMove(sourceTasks, activeIndex, overIndex)

      if (activeContainer === 'pending') {
        handlePendingChange(reorderedTasks)
      } else {
        handleCompletedChange(reorderedTasks)
      }

      return
    }

    const sourceTasks = activeContainer === 'pending' ? pendingTasks : completedTasks
    const targetTasks = overContainer === 'pending' ? pendingTasks : completedTasks
    const sourceIndex = sourceTasks.findIndex(task => task.id === active.id)

    if (sourceIndex === -1) return

    const movedTask = sourceTasks[sourceIndex]
    const sourceWithoutTask = sourceTasks.filter(task => task.id !== active.id)

    const overIsContainer = over.id === 'pending' || over.id === 'completed'
    const overIndex = overIsContainer ? targetTasks.length : targetTasks.findIndex(task => task.id === over.id)
    const insertionIndex = overIndex >= 0 ? overIndex : targetTasks.length

    const targetWithTask = [...targetTasks.slice(0, insertionIndex), movedTask, ...targetTasks.slice(insertionIndex)]

    if (activeContainer === 'pending') {
      setPendingTasks(sourceWithoutTask)
      setCompletedTasks(targetWithTask)
    } else {
      setCompletedTasks(sourceWithoutTask)
      setPendingTasks(targetWithTask)
    }

    toast.success(`Task moved to ${columnTitleMap[overContainer]}.`, {
      description: `${movedTask.title}`
    })
  }

  const activeTask = activeId ? getTaskById(activeId) : null

  return (
    <div className='space-y-4'>
      <Card>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className='grid gap-6 md:grid-cols-2'>
              <div>
                <h3 className='text-foreground mb-2 text-xl font-semibold'>Pending Tasks</h3>
                <SortableContext
                  id='pending'
                  items={pendingTasks.map(task => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className='min-h-12'>
                    {pendingTasks.map((task, index) => (
                      <div key={task.id} className={cn(index !== pendingTasks.length - 1 && 'border-b')}>
                        <TaskRow task={task} />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </div>
              <div>
                <h3 className='text-foreground mb-2 text-xl font-semibold'>Completed Tasks</h3>
                <SortableContext
                  id='completed'
                  items={completedTasks.map(task => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className='min-h-12'>
                    {completedTasks.map((task, index) => (
                      <div key={task.id} className={cn(index !== completedTasks.length - 1 && 'border-b')}>
                        <TaskRow task={task} />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </div>
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className='bg-background border-border flex items-center justify-between gap-3 rounded-md border p-3'>
                  <GripVerticalIcon className='text-muted-foreground size-4' />
                  <p className='text-muted-foreground flex-1 text-base'>{activeTask.title}</p>
                  <Avatar className='size-7 rounded-full'>
                    <AvatarImage src={activeTask.avatarSrc} alt={activeTask.title} className='rounded-full' />
                    <AvatarFallback className='text-[10px]'>{activeTask.avatarFallback}</AvatarFallback>
                  </Avatar>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      <p className='text-muted-foreground text-center text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://flyonui.com/docs/third-party-plugins/drag-and-drop/#shared'
          target='_blank'
          rel='noopener noreferrer'
        >
          FlyonUI
        </a>
      </p>
    </div>
  )
}

export default SortableTaskColumnsDemo
