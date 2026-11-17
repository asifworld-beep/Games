import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { CRESTS, THEMES } from '../config/themes.js'
import { LANGUAGES, getDirection, translate } from '../i18n/translations.js'

const COLORS = ['#e8b85b', '#d78162', '#739b88', '#8b81bc', '#82a8ca', '#d48ba0']

function Choice({ selected, children, onClick }) {
  return (
    <button className={`setting-choice${selected ? ' selected' : ''}`} type="button" onClick={onClick}>
      {children}{selected && <Check size={14} />}
    </button>
  )
}

export default function SettingsModal({ open, onClose, settings, updateSetting }) {
  const t = (key) => translate(settings.language, key)
  const direction = getDirection(settings.language)

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
            initial={{ opacity: 0, x: direction === 'rtl' ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === 'rtl' ? -20 : 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          >
            <header className="modal-heading">
              <div><p className="eyebrow">COURTYARD GAMES</p><h2 id="settings-title">{t('settings')}</h2></div>
              <button className="icon-button" type="button" onClick={onClose} aria-label={t('close')}><X size={17} /></button>
            </header>
            <div className="settings-content">
              <section className="setting-section">
                <h3>{t('avatar')}</h3>
                <label className="field-label" htmlFor="nickname">{t('nickname')}</label>
                <input id="nickname" className="text-input" maxLength={18} value={settings.nickname} onChange={(event) => updateSetting('nickname', event.target.value)} />
                <span className="field-label">{t('color')}</span>
                <div className="color-options" role="group" aria-label={t('color')}>
                  {COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`color-swatch${settings.avatarColor === color ? ' selected' : ''}`}
                      style={{ '--swatch': color }}
                      aria-label={color}
                      aria-pressed={settings.avatarColor === color}
                      onClick={() => updateSetting('avatarColor', color)}
                    />
                  ))}
                </div>
                <label className="field-label" htmlFor="crest">{t('crest')}</label>
                <select id="crest" className="text-input" value={settings.crest} onChange={(event) => updateSetting('crest', event.target.value)}>
                  {CRESTS.map((crest) => <option key={crest}>{crest}</option>)}
                </select>
                <label className="field-label" htmlFor="difficulty">{t('difficulty')}</label>
                <select id="difficulty" className="text-input" value={settings.difficulty} onChange={(event) => updateSetting('difficulty', event.target.value)}>
                  {['casual', 'clever', 'mastermind'].map((level) => <option key={level} value={level}>{t(level)}</option>)}
                </select>
              </section>

              <section className="setting-section">
                <h3>{t('language')}</h3>
                <select className="text-input language-select" aria-label={t('language')} value={settings.language} onChange={(event) => updateSetting('language', event.target.value)}>
                  {LANGUAGES.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
                </select>
              </section>

              <section className="setting-section">
                <h3>{t('theme')}</h3>
                <div className="choice-stack">
                  {Object.keys(THEMES).map((id) => (
                    <Choice key={id} selected={settings.theme === id} onClick={() => updateSetting('theme', id)}>{t(id)}</Choice>
                  ))}
                </div>
              </section>

              <section className="setting-section">
                <h3>{t('audio')}</h3>
                <label className="field-label" htmlFor="volume">{t('volume')} <span>{Math.round(settings.volume * 100)}%</span></label>
                <input id="volume" className="range-input" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(event) => updateSetting('volume', Number(event.target.value))} />
                <label className="toggle-row"><span>{t('music')}</span><input type="checkbox" checked={settings.ambientMusic} onChange={(event) => updateSetting('ambientMusic', event.target.checked)} /></label>
                <label className="toggle-row"><span>{t('haptics')}</span><input type="checkbox" checked={settings.haptics} onChange={(event) => updateSetting('haptics', event.target.checked)} /></label>
              </section>

              <section className="setting-section">
                <h3>{t('graphics')} & {t('rounds')}</h3>
                <label className="field-label" htmlFor="quality">{t('graphics')}</label>
                <select id="quality" className="text-input" value={settings.graphics} onChange={(event) => updateSetting('graphics', event.target.value)}>
                  <option value="high">{t('high')}</option><option value="saver">{t('saver')}</option>
                </select>
                <label className="field-label" htmlFor="round-count">{t('rounds')}</label>
                <select id="round-count" className="text-input" value={settings.rounds} onChange={(event) => updateSetting('rounds', Number(event.target.value))}>
                  {[3, 5, 7, 10].map((rounds) => <option value={rounds} key={rounds}>{rounds}</option>)}
                </select>
                <label className="field-label" htmlFor="turn-timer">{t('timer')}</label>
                <select id="turn-timer" className="text-input" value={settings.timer} onChange={(event) => updateSetting('timer', Number(event.target.value))}>
                  {[0, 15, 30].map((timer) => <option value={timer} key={timer}>{timer === 0 ? t('off') : `${timer}s`}</option>)}
                </select>
              </section>
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
