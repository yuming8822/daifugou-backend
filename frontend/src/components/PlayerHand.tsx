// ============================================================
// PlayerHand - Fan-spread card display with Framer Motion
// Premium marble-like card design with light/dark mode support
// Dynamic card sizing for small screens (all cards visible in one row)
// ============================================================
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardData } from '@/lib/types';
import { getSuitSymbol, getCardColor, getCardFanTransform } from '@/lib/cardUtils';

interface PlayerHandProps {
  cards: CardData[];
  selectedCards: Set<string>;
  onToggleSelect: (cardId: string) => void;
  isMyTurn: boolean;
  dealing: boolean;
}

/** Calculate dynamic card width based on total cards to fit in ~360px */
function getCardSize(totalCards: number): { width: number; height: number; fontSize: number; suitSize: number } {
  if (totalCards <= 6) return { width: 52, height: 72, fontSize: 15, suitSize: 18 };
  if (totalCards <= 8) return { width: 48, height: 68, fontSize: 14, suitSize: 16 };
  if (totalCards <= 10) return { width: 44, height: 64, fontSize: 13, suitSize: 15 };
  if (totalCards <= 12) return { width: 40, height: 60, fontSize: 12, suitSize: 14 };
  if (totalCards <= 15) return { width: 36, height: 56, fontSize: 11, suitSize: 12 };
  if (totalCards <= 18) return { width: 32, height: 52, fontSize: 10, suitSize: 11 };
  return { width: 28, height: 48, fontSize: 9, suitSize: 10 };
}

export default function PlayerHand({
  cards,
  selectedCards,
  onToggleSelect,
  isMyTurn,
  dealing,
}: PlayerHandProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Sort cards: by rank (3=lowest, 2=highest), then by suit
  const sortedCards = useMemo(() => {
    const rankOrder: Record<string, number> = {
      '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6,
      '10': 7, 'J': 8, 'Q': 9, 'K': 10, 'A': 11, '2': 12,
    };
    const suitOrder: Record<string, number> = {
      'club': 0, 'spade': 1, 'heart': 2, 'diamond': 3,
    };
    return [...cards].sort((a, b) => {
      if (a.isJoker && b.isJoker) return 0;
      if (a.isJoker) return 1;
      if (b.isJoker) return -1;
      const rankDiff = (rankOrder[a.rank] ?? 0) - (rankOrder[b.rank] ?? 0);
      if (rankDiff !== 0) return rankDiff;
      return (suitOrder[a.suit] ?? 0) - (suitOrder[b.suit] ?? 0);
    });
  }, [cards]);

  const totalCards = sortedCards.length;
  const cardSize = useMemo(() => getCardSize(totalCards), [totalCards]);

  // Stagger animation variants for dealing
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.2,
      },
    },
  } as const;

  const cardVariants = {
    hidden: {
      opacity: 0,
      x: 0,
      y: 100,
      rotate: -15,
      scale: 0.6,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 15,
        stiffness: 200,
        mass: 0.8,
      },
    },
  };

  if (totalCards === 0) return null;

  // Calculate overlap margin so all cards fit in ~360px
  // Total width = cardWidth + (totalCards - 1) * (cardWidth - overlap)
  // We want total width <= 340px (leaving 10px padding on each side)
  const containerWidth = 340;
  const overlap = totalCards <= 1 ? 0 : Math.max(2, cardSize.width - Math.floor((containerWidth - cardSize.width) / (totalCards - 1)));

  return (
    <motion.div
      className="relative flex items-end justify-center px-1 py-3 overflow-hidden"
      variants={dealing ? containerVariants : undefined}
      initial={dealing ? 'hidden' : undefined}
      animate={dealing ? 'visible' : undefined}
    >
      <AnimatePresence mode="popLayout">
        {sortedCards.map((card, index) => {
          const isSelected = selectedCards.has(card.id);
          const isHovered = hoveredCard === card.id;
          const { rotate, translateX, translateY } = getCardFanTransform(
            index,
            totalCards,
            isSelected,
            isHovered ? -8 : 0
          );

          const cardColor = getCardColor(card.suit, card.isJoker);
          const suitSymbol = getSuitSymbol(card.suit);

          // Negative margin for overlapping cards
          const marginLeft = index === 0 ? 0 : -overlap;

          return (
            <motion.div
              key={card.id}
              layout
              variants={dealing ? cardVariants : undefined}
              initial={dealing ? 'hidden' : false}
              animate={
                dealing
                  ? 'visible'
                  : {
                      x: translateX,
                      y: translateY,
                      rotate,
                    }
              }
              exit={{ opacity: 0, y: -50, scale: 0.5, transition: { duration: 0.2 } }}
              transition={
                dealing
                  ? undefined
                  : {
                      type: 'spring',
                      damping: 20,
                      stiffness: 250,
                      mass: 0.6,
                    }
              }
              style={{
                zIndex: isSelected || isHovered ? 100 : index,
                marginLeft,
                width: cardSize.width,
                height: cardSize.height,
                minWidth: cardSize.width,
              }}
              className={
                'relative cursor-pointer select-none shrink-0 rounded-lg card-glow transition-shadow duration-200' +
                (isMyTurn ? ' hover:shadow-[0_0_20px_rgba(72,176,212,0.3)]' : '')
              }
              onClick={() => onToggleSelect(card.id)}
              onHoverStart={() => setHoveredCard(card.id)}
              onHoverEnd={() => setHoveredCard(null)}
              whileHover={
                isMyTurn
                  ? {
                      y: -20,
                      scale: 1.08,
                      transition: {
                        type: 'spring',
                        damping: 12,
                        stiffness: 300,
                        mass: 0.5,
                      },
                    }
                  : undefined
              }
            >
              {/* Card face - marble-like gradient */}
              <div
                className={`
                  w-full h-full rounded-lg
                  flex flex-col items-center justify-center
                  font-mono font-bold
                  backdrop-blur-sm
                  border
                  ${isSelected
                    ? 'shadow-lg'
                    : isHovered
                      ? 'shadow-lg'
                      : ''
                  }
                  transition-colors duration-150
                `}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(201,149,60,0.15), rgba(201,149,60,0.05))'
                    : isHovered
                      ? 'linear-gradient(135deg, var(--color-glass-strong-bg), rgba(255,255,255,0.02))'
                      : 'linear-gradient(135deg, var(--color-card-bg), rgba(255,255,255,0.01))',
                  borderColor: isSelected
                    ? 'rgba(201, 149, 60, 0.6)'
                    : isHovered
                      ? 'var(--color-glass-strong-border)'
                      : 'var(--color-card-border)',
                  color: cardColor === 'red' ? '#f87171' : 'var(--color-foreground)',
                }}
              >
                {/* Rank */}
                <span className="leading-none mt-1" style={{ fontSize: cardSize.fontSize }}>
                  {card.isJoker ? 'JKR' : card.rank}
                </span>
                {/* Suit */}
                <span
                  className="leading-none mt-0.5"
                  style={{ fontSize: cardSize.suitSize, color: card.isJoker ? '#f87171' : undefined }}
                >
                  {card.isJoker ? '★' : suitSymbol}
                </span>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: 'var(--color-accent-gold)', boxShadow: '0 0 12px rgba(201,149,60,0.4)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
