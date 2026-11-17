import { AnimatePresence, motion } from 'framer-motion'

export default function PlayerSeat({ player, role, active, isGuessed, emote, nervous }) {
  return (
    <motion.div
      layout
      className={`player-seat${active ? ' is-active' : ''}${nervous ? ' is-nervous' : ''}`}
      animate={{ scale: active ? 1.06 : 1, y: active ? -3 : 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
    >
      {emote && <motion.span className="seat-emote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: -8 }} exit={{ opacity: 0 }}>{emote}</motion.span>}
      <span className="seat-avatar" style={{ '--seat-color': player.color }}>
        {player.crest === 'Peacock' ? 'P' : player.crest === 'Lotus' ? 'L' : player.crest === 'Sun' ? 'S' : player.initials}
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
    </motion.div>
  )
}
