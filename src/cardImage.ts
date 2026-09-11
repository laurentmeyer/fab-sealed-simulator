/**
 * Fabrary hosts the card art. Every card in the set has art now that it is fully revealed, but
 * a miss is still survivable: every <img> falls back to a text card rather than a gap.
 */
const IMAGE_URL = (image: string) => `https://content.fabrary.net/cards/${image}.webp`

export const cardImageUrl = (image: string | null): string | null =>
  image ? IMAGE_URL(image) : null
