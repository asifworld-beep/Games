import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Volume2, VolumeX, X } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { HumanCharacter } from './PlayerTotem.jsx'
import { CRESTS, TABLE_STYLES, THEMES } from '../config/themes.js'
import { LANGUAGES, getDirection, translate } from '../i18n/translations.js'
import { MUSIC_TRACKS } from '../soundEngine.js'
import ModeSelector from './ModeSelector.jsx'

const SKIN_TONES = ['#f1c7a6', '#dba987', '#bd805e', '#925c42', '#653e30']
const OUTFITS = [
  ['Saffron', '#e8a43c'], ['Emerald', '#39866c'], ['Royal Blue', '#4266a4'],
  ['Ruby', '#a83d50'], ['Violet', '#805aa4'], ['Ivory', '#e8ddc1'],
]
const CHARACTERS = [
  ['prince', 'Young Prince'], ['princess', 'Royal Princess'], ['scholar', 'Clever Scholar'],
  ['guard', 'Brave Guard'], ['trickster', 'Playful Trickster'],
]
const FONT_SCALES = [
  { value: 0.5, label: 'Extra Small' },
  { value: 0.75, label: 'Small' },
  { value: 0.9, label: 'Compact' },
  { value: 1, label: 'Standard' },
  { value: 1.12, label: 'Large' },
]
const FONT_STYLES = [
  { value: 'royal', label: 'Royal Heritage' },
  { value: 'modern', label: 'Modern Clean' },
  { value: 'playful', label: 'Playful Storyteller' },
  { value: 'contrast', label: 'High-Contrast Bold' },
]

function Choice({ selected, children, onClick }) {
  return (
    <button className={`setting-choice${selected ? ' selected' : ''}`} type="button" aria-pressed={selected} onClick={onClick}>
      {children}{selected && <Check size={14} />}
    </button>
  )
}

const LANGUAGE_ENGLISH = {
  hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi', ta: 'Tamil',
  gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi',
  or: 'Odia', ur: 'Urdu', bho: 'Bhojpuri',
}

function CustomSelect({ label, value, options, onChange }) {
  const details = useRef(null)
  const [search, setSearch] = useState('')
  const selected = options.find((option) => option.value === value)
  const visible = options.filter((option) => option.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()))

  useEffect(() => {
    const closeOutside = (event) => {
      if (details.current && !details.current.contains(event.target)) details.current.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  return (
    <div className="settings-select">
      <span className="field-label">{label}</span>
      <details ref={details} onToggle={(event) => { if (!event.currentTarget.open) setSearch('') }} onKeyDown={(event) => {
        if (event.key === 'Escape' && details.current?.open) {
          details.current.open = false
          details.current.querySelector('summary')?.focus()
          event.stopPropagation()
        }
      }}>
        <summary aria-label={`${label}: ${selected?.label ?? value}`}>
          {selected?.color && <i className="select-swatch" style={{ background: selected.color }} />}
          <span>{selected?.label ?? value}</span><ChevronDown size={16} />
        </summary>
        <div className="settings-select-menu">
          <input className="text-input" type="search" aria-label={`Search ${label}`} placeholder={`Search ${label}`} value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="settings-select-options">
            {visible.map((option) => (
              <button type="button" key={option.value} aria-pressed={option.value === value} onClick={() => {
                onChange(option.value)
                details.current.open = false
                details.current.querySelector('summary')?.focus()
              }}>
                {option.color && <i className="select-swatch" style={{ background: option.color }} />}
                <span>{option.label}</span>{option.value === value && <Check size={15} />}
              </button>
            ))}
            {visible.length === 0 && <p className="select-empty">No matching options</p>}
          </div>
        </div>
      </details>
    </div>
  )
}

function Accordion({ id, title, active, onToggle, children }) {
  return (
    <section className="settings-accordion">
      <h3><button type="button" aria-expanded={active} aria-controls={`${id}-panel`} onClick={onToggle}>
        {title}<ChevronDown size={17} className={active ? 'accordion-chevron open' : 'accordion-chevron'} />
      </button></h3>
      <div id={`${id}-panel`} inert={!active} aria-hidden={!active}>
        <AnimatePresence initial={false}>
          {active && <motion.div className="accordion-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="setting-section">{children}</div>
          </motion.div>}
        </AnimatePresence>
      </div>
    </section>
  )
}

export default function SettingsModal({ open, onClose, settings, updateSetting, onPlayerCountChange, playerCountDisabled, minimumPlayerCount, onActivateAudio, onResetCamera, onModeChange, modeDisabled }) {
  const t = (key) => translate(settings.language, key)
  const direction = getDirection(settings.language)
  const [accordion, setAccordion] = useState(null)
  const accordionProps = (id) => ({ id, active: accordion === id, onToggle: () => setAccordion((current) => current === id ? null : id) })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.section
            className="settings-modal glass-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            dir={direction}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          >
            <header className="modal-heading">
              <div><p className="eyebrow">COURTYARD GAMES</p><h2 id="settings-title">{t('settings')}</h2></div>
              <button className="icon-button" type="button" onClick={onClose} aria-label={t('close')}><X size={17} /></button>
            </header>
            <div className="settings-content">
              <section className="variant-top">
                <span className="field-label">{t('playerVariant')}</span>
                <div className="player-count-options" role="group" aria-label={t('playerVariant')}>
                  {[4, 5].map((count) => (
                    <button type="button" key={count} className={`player-count-option${settings.playerCount === count ? ' selected' : ''}`}
                      aria-pressed={settings.playerCount === count} disabled={playerCountDisabled || count < minimumPlayerCount}
                      onClick={() => onPlayerCountChange(count)}>
                      {count === 4 ? '4 Players Classic' : '5 Players Royal Court with Rani'}
                    </button>
                  ))}
                </div>
              </section>
              <div className="settings-selects">
                <CustomSelect label={t('language')} value={settings.language} options={LANGUAGES.map(({ id, name }) => ({ value: id, label: LANGUAGE_ENGLISH[id] ? `${name} • ${LANGUAGE_ENGLISH[id]}` : name }))} onChange={(value) => updateSetting('language', value)} />
                <CustomSelect label={t('theme')} value={settings.theme} options={Object.entries(THEMES).map(([id, theme]) => ({ value: id, label: t(id), color: theme.background }))} onChange={(value) => updateSetting('theme', value)} />
                <CustomSelect label="Royal Table Style" value={settings.tableStyle} options={Object.entries(TABLE_STYLES).map(([id, style]) => ({ value: id, label: style.name }))} onChange={(value) => updateSetting('tableStyle', value)} />
                <CustomSelect label="Background Music Track" value={settings.musicTrack} options={MUSIC_TRACKS.map(({ id, name }) => ({ value: id, label: name }))} onChange={(value) => updateSetting('musicTrack', value)} />
              </div>
              <Accordion {...accordionProps('avatar')} title="Character & Avatar">
                <label className="field-label" htmlFor="nickname">{t('nickname')}</label>
                <input id="nickname" className="text-input" maxLength={18} value={settings.nickname} onChange={(event) => updateSetting('nickname', event.target.value)} />
                <label className="field-label" htmlFor="character-style">Character style</label>
                <select id="character-style" className="text-input" value={settings.characterStyle} onChange={(event) => updateSetting('characterStyle', event.target.value)}>
                  {CHARACTERS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                <span className="field-label">Skin tone</span>
                <div className="color-options" role="group" aria-label="Skin tone">
                  {SKIN_TONES.map((color, index) => (
                    <button
                      type="button"
                      key={color}
                      className={`color-swatch${settings.skinTone === color ? ' selected' : ''}`}
                      style={{ '--swatch': color }}
                      aria-label={`Skin tone ${index + 1}`}
                      aria-pressed={settings.skinTone === color}
                      onClick={() => updateSetting('skinTone', color)}
                    />
                  ))}
                </div>
                <span className="field-label">Outfit color</span>
                <div className="color-options" role="group" aria-label="Outfit color">
                  {OUTFITS.map(([label, color]) => (
                    <button type="button" key={color} className={`color-swatch${settings.avatarColor === color ? ' selected' : ''}`}
                      style={{ '--swatch': color }} aria-label={label} aria-pressed={settings.avatarColor === color}
                      onClick={() => updateSetting('avatarColor', color)} />
                  ))}
                </div>
                <div className="avatar-preview">
                  <Canvas camera={{ position: [0, 1.1, 3.2], fov: 40 }} dpr={[1, 1.5]}>
                    <ambientLight intensity={1.6} />
                    <directionalLight position={[3, 5, 4]} intensity={2} />
                    <HumanCharacter color={settings.avatarColor} skinTone={settings.skinTone} characterStyle={settings.characterStyle} />
                  </Canvas>
                  <span>{CHARACTERS.find(([value]) => value === settings.characterStyle)?.[1]}</span>
                </div>
                <label className="field-label" htmlFor="crest">{t('crest')}</label>
                <select id="crest" className="text-input" value={settings.crest} onChange={(event) => updateSetting('crest', event.target.value)}>
                  {CRESTS.map((crest) => <option key={crest}>{crest}</option>)}
                </select>
              </Accordion>

              <Accordion {...accordionProps('typography')} title="Typography & Accessibility">
                <span className="field-label">Font size</span>
                <div className="font-scale-options" role="group" aria-label="Font size preset">
                  {FONT_SCALES.map(({ value, label }) => (
                    <button
                      className={`setting-choice${settings.fontScale === value ? ' selected' : ''}`}
                      type="button"
                      key={value}
                      aria-pressed={settings.fontScale === value}
                      onClick={() => updateSetting('fontScale', value)}
                    >
                      {label} ({Math.round(value * 100)}%)
                    </button>
                  ))}
                </div>
                <label className="field-label" htmlFor="font-scale">
                  Custom size <span>{Math.round((settings.fontScale ?? 1) * 100)}%</span>
                </label>
                <input
                  id="font-scale"
                  className="range-input"
                  type="range"
                  min="0.7"
                  max="1.25"
                  step="0.05"
                  value={Math.max(0.7, Math.min(1.25, settings.fontScale ?? 1))}
                  aria-label="Custom font size"
                  onChange={(event) => updateSetting('fontScale', Number(event.target.value))}
                />
                <small className="font-scale-hint">Slider: 70–125% in 5% steps; 50% and 112% are preset-only.</small>
                <span className="field-label">Font style</span>
                <div className="choice-stack">
                  {FONT_STYLES.map(({ value, label }) => (
                    <Choice
                      key={value}
                      selected={(settings.fontStyle ?? 'royal') === value}
                      onClick={() => updateSetting('fontStyle', value)}
                    >
                      {label}
                    </Choice>
                  ))}
                </div>
                <p className="typography-preview" aria-live="polite">A clear view of the royal court — राजा मंत्री चोर सिपाही</p>
              </Accordion>

              <Accordion {...accordionProps('audio')} title="Audio & Graphics">
                <label className="field-label" htmlFor="volume">{t('volume')} <span>{Math.round(settings.volume * 100)}%</span></label>
                <input id="volume" className="range-input" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(event) => updateSetting('volume', Number(event.target.value))} />
                <label className="field-label" htmlFor="music-volume">Music volume <span>{Math.round(settings.musicVolume * 100)}%</span></label>
                <input id="music-volume" className="range-input" type="range" min="0" max="1" step="0.05" value={settings.musicVolume} onChange={(event) => updateSetting('musicVolume', Number(event.target.value))} />
                <div className="toggle-row"><span>{t('music')}</span><button type="button" className="icon-button" aria-label={settings.ambientMusic ? 'Mute music' : 'Unmute music'} aria-pressed={!settings.ambientMusic} onClick={() => {
                  if (!settings.ambientMusic) onActivateAudio()
                  updateSetting('ambientMusic', !settings.ambientMusic)
                }}>{settings.ambientMusic ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div>
                <label className="toggle-row"><span>{t('haptics')}</span><input type="checkbox" checked={settings.haptics} onChange={(event) => updateSetting('haptics', event.target.checked)} /></label>
                <button className="secondary-button" type="button" onClick={onResetCamera}>Reset camera to your seat</button>
                <label className="field-label" htmlFor="quality">{t('graphics')}</label>
                <select id="quality" className="text-input" value={settings.graphics} onChange={(event) => updateSetting('graphics', event.target.value)}>
                  <option value="high">{t('high')}</option><option value="saver">{t('saver')}</option>
                </select>
              </Accordion>

              <Accordion {...accordionProps('rules')} title="Game Rules & Variant">
                <span className="field-label">{t('mode')}</span>
                <ModeSelector mode={settings.mode} language={settings.language} onChange={onModeChange} disabled={modeDisabled} />
                {modeDisabled && <small className="font-scale-hint">Change game mode in the lobby.</small>}
                <label className="field-label" htmlFor="difficulty">{t('difficulty')}</label>
                <select id="difficulty" className="text-input" value={settings.difficulty} onChange={(event) => updateSetting('difficulty', event.target.value)}>
                  {['casual', 'clever', 'mastermind'].map((level) => <option key={level} value={level}>{t(level)}</option>)}
                </select>
                <label className="field-label" htmlFor="round-count">{t('rounds')}</label>
                <select id="round-count" className="text-input" value={settings.rounds} onChange={(event) => updateSetting('rounds', Number(event.target.value))}>
                  {[3, 5, 7].map((rounds) => <option value={rounds} key={rounds}>{rounds}</option>)}
                </select>
                <label className="field-label" htmlFor="turn-timer">{t('timer')}</label>
                <select id="turn-timer" className="text-input" value={settings.timer} onChange={(event) => updateSetting('timer', Number(event.target.value))}>
                  {[20, 25, 30].map((timer) => <option value={timer} key={timer}>{timer}s</option>)}
                </select>
              </Accordion>
            </div>
            <footer className="modal-footer">
              <span className="saved-hint">{t('autoSaved')}</span>
              <button className="primary-button modal-done" type="button" onClick={onClose}>{t('save')} <Check size={15} /></button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
