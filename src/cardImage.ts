/**
 * Fabrary hosts the card art. Not every Usurp the Shadow Throne card is revealed yet, so
 * misses are expected until release day and every <img> falls back to a text card.
 */
const IMAGE_URL = (image: string) => `https://content.fabrary.net/cards/${image}.webp`

export const cardImageUrl = (image: string | null): string | null =>
  image ? IMAGE_URL(image) : null
