import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Crown, Users, Wifi } from 'lucide-react'
import { getDirection, translate } from '../i18n/translations.js'

const MODES = [
  { id: 'solo', icon: Crown },
  { id: 'local', icon: Users },
  { id: 'online', icon: Wifi },
]

export default function ModeSelector({ mode, language, onChange, disabled = false, popover = false }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const trigger = useRef(null)
  const menu = useRef(null)
  const t = (key) => translate(language, key)
  const Icon = MODES.find(({ id }) => id === mode)?.icon ?? Crown
  const active = open && !disabled

  useEffect(() => {
    if (!active) return undefined
    menu.current?.querySelector('[aria-checked="true"]')?.focus()
    const outside = (event) => {
      if (!trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false)
    }
    const close = () => setOpen(false)
    const closeOnScroll = (event) => {
      if (!menu.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    if (popover) {
      window.addEventListener('resize', close)
      document.addEventListener('wheel', closeOnScroll, { passive: true })
      document.addEventListener('touchmove', closeOnScroll, { passive: true })
    }
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', close)
      document.removeEventListener('wheel', closeOnScroll)
      document.removeEventListener('touchmove', closeOnScroll)
    }
  }, [active, popover])

  const closeAndFocus = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  const options = active && (
    <div ref={menu} className={`mode-picker-menu${popover ? ' is-popover' : ''}`} role="menu" aria-label={t('mode')}
      dir={getDirection(language)} style={popover ? position : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          closeAndFocus()
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          const items = [...event.currentTarget.querySelectorAll('[role="menuitemradio"]')]
          const index = items.indexOf(document.activeElement)
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
          items[next]?.focus()
        }
      }}>
      {MODES.map(({ id, icon: OptionIcon }) => (
        <button type="button" role="menuitemradio" aria-checked={mode === id} key={id} onClick={() => {
          onChange(id)
          closeAndFocus()
        }}><OptionIcon size={16} /><span>{t(id)}</span>{mode === id && <Check size={15} />}</button>
      ))}
    </div>
  )

  return (
    <div className={`mode-picker${popover ? ' in-dock' : ''}`}>
      <button ref={trigger} className="mode-picker-trigger" type="button" disabled={disabled} aria-label={`${t('mode')}: ${t(mode)}`} aria-haspopup="menu" aria-expanded={active}
        onClick={() => {
          if (!open && popover) {
            const rect = trigger.current.getBoundingClientRect()
            const width = Math.min(250, window.innerWidth - 16)
            setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), bottom: window.innerHeight - rect.top + 6, width })
          }
          setOpen((value) => !value)
        }}>
        <Icon size={16} /><span>{t(mode)}</span><ChevronDown size={15} />
      </button>
      {popover ? createPortal(options, document.body) : options}
    </div>
  )
}
