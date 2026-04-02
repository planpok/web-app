export const DECK_PRESETS = {
  fibonacci: ['1', '2', '3', '5', '8', '13', '21', '?'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', '?'],
  custom: ['1', '2', '3', '5', '8', '13', '?']
} as const;

export type DeckMode = keyof typeof DECK_PRESETS;

export const DEFAULT_DECK_MODE: DeckMode = 'fibonacci';

export function parseCustomDeck(input: string): string[] {
  const cards = input
    .split(',')
    .map((card) => card.trim())
    .filter(Boolean);

  return Array.from(new Set(cards));
}
