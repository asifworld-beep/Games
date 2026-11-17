import { AnimatePresence, motion } from 'framer-motion'
import { AvatarMark } from './RoleIcon.jsx'

export default function PlayerSeat({ player, role, hiddenRole, active, isGuessed, emote, nervous, callout }) {
  return (
    <div
      className={`player-seat${active ? ' is-active' : ''}${nervous ? ' is-nervous' : ''}`}
    >
      {emote && <motion.span className="seat-emote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: -8 }} exit={{ opacity: 0 }}>{emote}</motion.span>}
      {callout && <span className="seat-callout" aria-hidden="true">{callout}</span>}
      <span className="seat-avatar" style={{ '--seat-color': player.color }}>
        <AvatarMark player={player} role={role} hiddenRole={hiddenRole} />
      </span>
      <span className="seat-label-group">
        <span className="seat-name">{player.name}</span>
        <AnimatePresence mode="wait">
          {role && (
            <motion.span
              key={role.name}
              className="seat-role"
              initial={{ opacity: 0, rotateX: -80, height: 0 }}
              animate={{ opacity: 1, rotateX: 0, height: 'auto' }}
              exit={{ opacity: 0, rotateX: 80, height: 0 }}
              transition={{ duration: 0.28 }}
            >
              {role.name}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {isGuessed && <span className="guess-marker">?</span>}
      {nervous && <span className="nervous-drop">!</span>}
    </div>
  )
}
