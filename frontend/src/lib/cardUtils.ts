// ============================================================
// Card Utilities for Daifugou (大富豪)
// ============================================================

export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type CardRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface CardData {
  id: string;
  suit: Suit;
  rank: CardRank;
  isJoker: boolean;
}

/** Create a full 54-card deck */
export function createDeck(): CardData[] {
  const suits: Suit[] = ['spade', 'heart', 'diamond', 'club'];
  const ranks: CardRank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const deck: CardData[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        isJoker: false,
      });
    }
  }

  // Two Jokers
  deck.push({ id: 'joker_red', suit: 'heart', rank: '2', isJoker: true });
  deck.push({ id: 'joker_black', suit: 'spade', rank: '2', isJoker: true });

  return deck;
}

/** Fisher-Yates shuffle */
export function shuffleDeck(deck: CardData[]): CardData[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Get display symbol for suit */
export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spade': return '♠';
    case 'heart': return '♥';
    case 'diamond': return '♦';
    case 'club': return '♣';
  }
}

/** Get display text for rank */
export function getRankDisplay(rank: CardRank): string {
  return rank;
}

/** Get card color (red or black) */
export function getCardColor(suit: Suit, isJoker: boolean): 'red' | 'black' {
  if (isJoker) return 'red';
  return suit === 'heart' || suit === 'diamond' ? 'red' : 'black';
}

/** Calculate individual card transform in fan */
export function getCardFanTransform(
  index: number,
  totalCards: number,
  isSelected: boolean,
  hoverOffset: number = 0
): { rotate: number; translateX: number; translateY: number } {
  if (totalCards <= 1) {
    return { rotate: 0, translateX: 0, translateY: isSelected ? -25 + hoverOffset : hoverOffset };
  }

  // Very subtle fan angle - just enough for visual flair, not for positioning
  // Cards overlap via negative margin in the component, not via translateX
  const maxAngle = Math.min(totalCards * 0.8, 18);
  const anglePerCard = maxAngle / (totalCards - 1);
  const startAngle = -maxAngle / 2;
  
  const rotate = startAngle + anglePerCard * index;
  
  // Minimal horizontal offset - just a few pixels for the fan curve
  // The real overlap is handled by negative margins in PlayerHand
  const spreadRadius = Math.min(totalCards * 1.2, 24);
  const rad = (rotate * Math.PI) / 180;
  const translateX = Math.sin(rad) * spreadRadius;
  const translateY = isSelected ? -25 + hoverOffset : hoverOffset;

  return { rotate, translateX, translateY };
}
