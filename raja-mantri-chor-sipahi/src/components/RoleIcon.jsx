import { CircleHelp, Crown, Feather, Flower2, ScrollText, Shield, Sparkles, Sun, VenetianMask } from 'lucide-react'

const ICONS = {
  raja: Crown,
  rani: Sparkles,
  mantri: ScrollText,
  sipahi: Shield,
  chor: VenetianMask,
}

export default function RoleIcon({ role }) {
  const Icon = ICONS[role] ?? CircleHelp
  return <Icon className={`role-icon${role ? ` role-icon-${role}` : ' role-icon-hidden'}`} size={14} strokeWidth={2} aria-hidden="true" />
}

const CREST_ICONS = { Crown, Peacock: Feather, Lotus: Flower2, Sun }

export function AvatarMark({ player, role, hiddenRole }) {
  if (role || hiddenRole) return <RoleIcon role={role?.id} />
  const Crest = CREST_ICONS[player.crest]
  return Crest ? <Crest size={14} className="role-icon" aria-hidden="true" /> : player.initials
}
