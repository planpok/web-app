import { DEFAULT_DECK_MODE, DECK_PRESETS, parseCustomDeck } from '@/lib/decks';

describe('deck helpers', () => {
  it('keeps the default mode aligned with the fibonacci preset', () => {
    expect(DEFAULT_DECK_MODE).toBe('fibonacci');
    expect(DECK_PRESETS[DEFAULT_DECK_MODE]).toContain('13');
  });

  it('parses a custom deck and removes duplicates', () => {
    expect(parseCustomDeck('1, 2, 3, 2, ?, , 5')).toEqual(['1', '2', '3', '?', '5']);
  });
});
