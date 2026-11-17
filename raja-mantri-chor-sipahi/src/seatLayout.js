export function getNameplatePosition(x, y, width, height, badgeWidth, badgeHeight) {
  const halfWidth = Math.min(badgeWidth / 2, width / 2)
  return {
    x: Math.max(halfWidth, Math.min(width - halfWidth, x)),
    y: Math.max(badgeHeight, Math.min(height, y - 6)),
  }
}
