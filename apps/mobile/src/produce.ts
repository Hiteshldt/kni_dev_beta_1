// Emoji per catalog slug — the visual grid is core to KANNI's icon-driven,
// near-zero-typing USP. Falls back to a leaf for anything new.
const EMOJI: Record<string, string> = {
  tomato: '🍅',
  onion: '🧅',
  potato: '🥔',
  brinjal: '🍆',
  okra: '🌿',
  greens: '🥬',
  chilli: '🌶️',
  carrot: '🥕',
  cabbage: '🥬',
  banana: '🍌',
  mango: '🥭',
  coconut: '🥥',
  lemon: '🍋',
  papaya: '🫐',
  'rice-paddy': '🌾',
};

export function produceEmoji(slug?: string): string {
  return (slug && EMOJI[slug]) || '🥬';
}
