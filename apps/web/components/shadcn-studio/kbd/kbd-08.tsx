'use client'

import { useEffect, useState } from 'react'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon, CopyIcon } from "lucide-react"

const Modifiers = [
  { label: '⌘', name: 'Cmd' },
  { label: '⇧', name: 'Shift' },
  { label: '⌥', name: 'Option' },
  { label: '⌃', name: 'Ctrl' }
]

const LetterKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const Numberkeys = '0123456789'.split('')

type SpecialKey = { id: string; display: React.ReactNode }

const SpecialKeys: SpecialKey[] = [
  { id: 'Esc', display: 'Esc' },
  { id: 'Tab', display: 'Tab' },
  { id: 'Enter', display: 'Enter' },
  {
    id: '←',
    display: (
      <ArrowLeftIcon className='size-3.5' />
    )
  },
  {
    id: '→',
    display: (
      <ArrowRightIcon className='size-3.5' />
    )
  },
  {
    id: '↑',
    display: (
      <ArrowUpIcon className='size-3.5' />
    )
  },
  {
    id: '↓',
    display: (
      <ArrowDownIcon className='size-3.5' />
    )
  }
]

const KbdComboBuilderDemo = () => {
  const [activeModifiers, setActiveModifiers] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const toggleModifier = (name: string) => {
    setActiveModifiers(prev => (prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]))
  }

  const selectKey = (key: string) => {
    setActiveKey(prev => (prev === key ? null : key))
  }

  const clear = () => {
    setActiveModifiers([])
    setActiveKey(null)
  }

  const hasCombo = activeModifiers.length > 0 || activeKey !== null

  const orderedModifiers = Modifiers.filter(m => activeModifiers.includes(m.name))

  useEffect(() => {
    if (!isFocused) return

    const MODIFIER_MAP: Record<string, string> = {
      Meta: 'Cmd',
      Shift: 'Shift',
      Alt: 'Option',
      Control: 'Ctrl'
    }

    const SPECIAL_KEY_MAP: Record<string, string> = {
      Escape: 'Esc',
      Tab: 'Tab',
      Enter: 'Enter',
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓'
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const modName = MODIFIER_MAP[e.key]

      if (modName) {
        e.preventDefault()
        setActiveModifiers(prev => (prev.includes(modName) ? prev.filter(m => m !== modName) : [...prev, modName]))

        return
      }

      const specialId = SPECIAL_KEY_MAP[e.key]

      if (specialId) {
        e.preventDefault()
        setActiveKey(prev => (prev === specialId ? null : specialId))

        return
      }

      if (e.key.length === 1 && /[A-Za-z]/.test(e.key)) {
        e.preventDefault()
        const upper = e.key.toUpperCase()

        setActiveKey(prev => (prev === upper ? null : upper))

        return
      }

      if (e.key.length === 1 && /[0-9]/.test(e.key)) {
        e.preventDefault()
        setActiveKey(prev => (prev === e.key ? null : e.key))
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFocused])

  const copyCombo = () => {
    const parts = [...orderedModifiers.map(m => `${m.label} ${m.name}`), ...(activeKey ? [activeKey] : [])]

    navigator.clipboard.writeText(parts.join(' + ')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className='flex w-full max-w-sm flex-col gap-4'
      onFocus={() => setIsFocused(true)}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsFocused(false)
      }}
    >
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>Combo Builder</span>
        <button
          onClick={clear}
          disabled={!hasCombo}
          className='text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50'
        >
          Clear
        </button>
      </div>

      {/* Result display */}
      <div className='bg-muted/50 relative flex min-h-11 items-center justify-center rounded-md border px-4 py-2'>
        {hasCombo ? (
          <>
            <KbdGroup className='flex flex-wrap items-center gap-1'>
              {orderedModifiers.map((mod, i) => (
                <span key={mod.name} className='flex items-center gap-1'>
                  <Kbd className='bg-background h-6 rounded border px-2 text-sm font-medium shadow-sm'>
                    {mod.label} {mod.name}
                  </Kbd>
                  {(i < orderedModifiers.length - 1 || activeKey) && (
                    <span className='text-muted-foreground text-sm'>+</span>
                  )}
                </span>
              ))}
              {activeKey && (
                <Kbd className='bg-background h-6 rounded border px-2 py-1 text-sm font-medium shadow-sm'>
                  {SpecialKeys.find(k => k.id === activeKey)?.display ?? activeKey}
                </Kbd>
              )}
            </KbdGroup>
            <button
              onClick={copyCombo}
              className='text-muted-foreground hover:text-foreground absolute right-2 transition-colors'
              aria-label='Copy combo'
            >
              {copied ? (
                <CheckIcon className='size-3.5' />
              ) : (
                <CopyIcon className='size-3.5' />
              )}
            </button>
          </>
        ) : (
          <span className='text-muted-foreground text-sm'>Click or press keys on your keyboard</span>
        )}
      </div>

      {/* Modifier toggles */}
      <div className='flex flex-col gap-2'>
        <span className='text-muted-foreground text-sm font-medium'>Modifiers</span>
        <div className='flex gap-2'>
          {Modifiers.map(mod => {
            const isActive = activeModifiers.includes(mod.name)

            return (
              <Button
                key={mod.name}
                onClick={() => toggleModifier(mod.name)}
                className='flex items-center gap-1 rounded border text-sm font-medium transition-all'
                variant={isActive ? 'default' : 'outline'}
              >
                <span>{mod.label}</span>
                <span className='text-xs'>{mod.name}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Letter keys */}
      <div className='flex flex-col gap-2'>
        <span className='text-muted-foreground text-sm font-medium'>Letters</span>
        <div className='flex flex-wrap gap-1.5'>
          {LetterKeys.map(key => (
            <Button
              key={key}
              onClick={() => selectKey(key)}
              className='size-8 rounded border text-sm font-medium transition-all'
              variant={activeKey === key ? 'default' : 'outline'}
            >
              {key}
            </Button>
          ))}
        </div>
      </div>

      {/* Number + Special keys */}
      <div className='flex gap-6'>
        <div className='flex flex-col gap-2'>
          <span className='text-muted-foreground text-sm font-medium'>Numbers</span>
          <div className='flex flex-wrap gap-1.5'>
            {Numberkeys.map(key => (
              <Button
                key={key}
                onClick={() => selectKey(key)}
                className='size-8 rounded border text-sm font-medium transition-all'
                variant={activeKey === key ? 'default' : 'outline'}
              >
                {key}
              </Button>
            ))}
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          <span className='text-muted-foreground text-sm font-medium'>Special</span>
          <div className='flex flex-wrap gap-1.5'>
            {SpecialKeys.map(key => (
              <Button
                key={key.id}
                onClick={() => selectKey(key.id)}
                className='h-8 rounded border px-2 text-sm font-medium transition-all'
                variant={activeKey === key.id ? 'default' : 'outline'}
              >
                {key.display}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KbdComboBuilderDemo
