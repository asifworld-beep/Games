import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Crown, Eye, Shield, Sparkles, X } from 'lucide-react'
import { translate, translateRole } from '../i18n/translations.js'

const STEPS = [
  { title: 'step1', body: 'step1Body', icon: Sparkles, roles: [['Raja', '1000'], ['Mantri', '800'], ['Sipahi', '500'], ['Chor', '0']] },
  { title: 'step2', body: 'step2Body', icon: Crown },
  { title: 'step3', body: 'step3Body', icon: Eye },
  { title: 'step4', body: 'step4Body', icon: Shield },
]

export default function HowToPlay({ open, onClose, language }) {
  const t = (key) => translate(language, key)
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
            className="guide-modal glass-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            dir={language === 'ur' ? 'rtl' : 'ltr'}
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          >
            <header className="modal-heading">
              <div><p className="eyebrow">COURTYARD GAMES</p><h2 id="guide-title">{t('guide')}</h2></div>
              <button className="icon-button" type="button" onClick={onClose} aria-label={t('close')}><X size={17} /></button>
            </header>
            <p className="guide-intro">{t('guideIntro')}</p>
            <div className="guide-steps">
              {STEPS.map(({ title, body, icon: Icon, roles }, index) => (
                <article className="guide-step" key={title}>
                  <span className="step-number">0{index + 1}</span>
                  <span className="step-icon"><Icon size={18} /></span>
                  <div className="step-copy"><h3>{t(title)}</h3><p>{t(body)}</p></div>
                  {roles && (
                    <div className="role-badges">
                      {roles.map(([role, points]) => (
                        <span className="role-badge" key={role}><b>{translateRole(language, role.toLowerCase())}</b><small>{points}</small></span>
                      ))}
                    </div>
                  )}
                  {index === 3 && <div className="steal-diagram"><span>{translateRole(language, 'mantri')} <b>−800</b></span><ArrowRight size={14} /><span>{translateRole(language, 'chor')} <b>+800</b></span></div>}
                </article>
              ))}
            </div>
            <button className="primary-button modal-done" type="button" onClick={onClose}>{t('close')} <ArrowRight size={15} /></button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
