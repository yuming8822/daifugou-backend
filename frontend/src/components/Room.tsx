// ============================================================
// Room - Waiting room + Game board with premium UI
// ============================================================
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RoomState, CardData, ChatMessage, Language } from '@/lib/types';
import { t } from '@/lib/i18n';
import PlayerHand from './PlayerHand';
import RulesPanel from './RulesPanel';

// ============================================================
// Constants
// ============================================================
const QUICK_CHAT_KEYS = [
  'chat.nice',
  'chat.pass',
  'chat.boss',
  'chat.lucky',
  'chat.unlucky',
  'chat.gg',
];

const REVOLUTION_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  xOffset: (Math.random() - 0.5) * 200,
  yOffset: (Math.random() - 0.5) * 200,
  delay: Math.random() * 0.5,
}));

// ============================================================
// Props
// ============================================================
interface RoomProps {
  lang: Language;
  room: RoomState;
  playerId: string;
  playerName: string;
  hand: CardData[];
  currentTurn: string | null;
  revolution: boolean;
  tableCards: CardData[] | null;
  lastPlayedBy: string | null;
  finishOrder: string[];
  roundNumber: number;
  myRank: string | null;
  miyakoOchi: boolean;
  gameEvent: { type: string; playerId?: string } | null;
  chatMessages: ChatMessage[];
  error: string | null;
  onAddBot: (roomId: string) => void;
  onRemoveBot: (roomId: string, botId: string) => void;
  onStartGame: (roomId: string) => void;
  onPlayCards: (roomId: string, cardIds: string[]) => void;
  onPassTurn: (roomId: string) => void;
  onNextRound: (roomId: string) => void;
  onSendChat: (roomId: string, message: string) => void;
  onLeave: () => void;
}

// ============================================================
// Component
// ============================================================
export default function Room({
  lang,
  room,
  playerId,
  playerName,
  hand,
  currentTurn,
  revolution,
  tableCards,
  lastPlayedBy,
  finishOrder,
  roundNumber,
  myRank,
  miyakoOchi,
  gameEvent,
  chatMessages,
  error,
  onAddBot,
  onRemoveBot,
  onStartGame,
  onPlayCards,
  onPassTurn,
  onNextRound,
  onSendChat,
  onLeave,
}: RoomProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [showRevolutionEffect, setShowRevolutionEffect] = useState(false);
  const [showEightGiriEffect, setShowEightGiriEffect] = useState(false);
  const [showMiyakoOchiEffect, setShowMiyakoOchiEffect] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
  const prevGameEventRef = useRef<string>('');

  const isHost = room.hostId === playerId;
  const isPlaying = room.status === 'playing';
  const isFinished = room.status === 'finished';
  const isMyTurn = currentTurn === playerId;
  const canAddBot = isHost && room.players.length < room.maxPlayers && !isPlaying && !isFinished;
  const canStart = isHost && room.players.length >= 2 && !isPlaying && !isFinished;

  // Handle game events for visual effects
  useEffect(() => {
    if (!gameEvent) return;
    const eventKey = `${gameEvent.type}-${gameEvent.playerId || ''}`;
    if (eventKey === prevGameEventRef.current) return;
    prevGameEventRef.current = eventKey;

    const timers: ReturnType<typeof setTimeout>[] = [];

    switch (gameEvent.type) {
      case 'revolution':
        timers.push(setTimeout(() => setShowRevolutionEffect(true), 0));
        timers.push(setTimeout(() => setShowRevolutionEffect(false), 2000));
        break;
      case 'eightGiri':
        timers.push(setTimeout(() => setShowEightGiriEffect(true), 0));
        timers.push(setTimeout(() => setShowEightGiriEffect(false), 1500));
        break;
      case 'miyakoOchi':
        timers.push(setTimeout(() => setShowMiyakoOchiEffect(true), 0));
        timers.push(setTimeout(() => setShowMiyakoOchiEffect(false), 3000));
        break;
      case 'newRound':
        timers.push(setTimeout(() => setDealing(true), 0));
        timers.push(setTimeout(() => setDealing(false), 2000));
        break;
      case 'gameEnd':
        timers.push(setTimeout(() => setDealing(false), 0));
        break;
    }

    return () => timers.forEach(clearTimeout);
  }, [gameEvent]);

  // Clear selection when turn changes
  useEffect(() => {
    const timer = setTimeout(() => setSelectedCards(new Set()), 0);
    return () => clearTimeout(timer);
  }, [currentTurn]);

  // Turn timer (30 seconds) - auto pass when time runs out
  // Pauses when BossKey is active (detected via DOM query)
  const timerPausedRef = useRef(false);
  const autoPassTriggeredRef = useRef(false);
  const autoPassFnRef = useRef<() => void>(() => {});

  // Keep auto-pass callback up to date
  useEffect(() => {
    autoPassFnRef.current = () => {
      if (isMyTurn && isPlaying) {
        onPassTurn(room.id);
      }
    };
  }, [isMyTurn, isPlaying, onPassTurn, room.id]);

  useEffect(() => {
    if (!isPlaying || !currentTurn) {
      setTurnTimeLeft(null);
      return;
    }
    setTurnTimeLeft(30);
    timerPausedRef.current = false;
    autoPassTriggeredRef.current = false;

    const interval = setInterval(() => {
      // Check if boss key is active (look for the boss key overlay in DOM)
      const bossKeyActive = document.querySelector('.fixed.inset-0.z-\\[100\\]') !== null;
      if (bossKeyActive) {
        timerPausedRef.current = true;
        return; // Skip this tick - don't decrement
      }
      timerPausedRef.current = false;

      setTurnTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTurn]);

  // Auto-pass when timer reaches 0
  useEffect(() => {
    if (turnTimeLeft === 0 && isMyTurn && isPlaying && !autoPassTriggeredRef.current) {
      autoPassTriggeredRef.current = true;
      autoPassFnRef.current();
    }
  }, [turnTimeLeft, isMyTurn, isPlaying]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [room.id]);

  const handleToggleSelect = useCallback((cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const handlePlayCards = useCallback(() => {
    if (!isMyTurn || selectedCards.size === 0) return;
    onPlayCards(room.id, Array.from(selectedCards));
  }, [isMyTurn, selectedCards, onPlayCards, room.id]);

  const handlePass = useCallback(() => {
    if (!isMyTurn) return;
    onPassTurn(room.id);
  }, [isMyTurn, onPassTurn, room.id]);

  const handleStartGame = useCallback(() => {
    setDealing(true);
    onStartGame(room.id);
    setTimeout(() => setDealing(false), 2000);
  }, [onStartGame, room.id]);

  const handleNextRound = useCallback(() => {
    onNextRound(room.id);
  }, [onNextRound, room.id]);

  const handleQuickChat = useCallback((key: string) => {
    onSendChat(room.id, t(key, lang));
    setShowChat(false);
  }, [onSendChat, room.id, lang]);

  // Sort players by seatIndex
  const sortedPlayers = useMemo(
    () => [...room.players].sort((a, b) => a.seatIndex - b.seatIndex),
    [room.players]
  );

  // Get the player who last played
  const lastPlayer = useMemo(
    () => (lastPlayedBy ? room.players.find((p) => p.id === lastPlayedBy) : null),
    [lastPlayedBy, room.players]
  );

  // Get current turn player name
  const currentPlayer = useMemo(
    () => (currentTurn ? room.players.find((p) => p.id === currentTurn) : null),
    [currentTurn, room.players]
  );

  // Check if I'm finished
  const iAmFinished = finishOrder.includes(playerId);
  const iAmMiyakoOchi = miyakoOchi;

  // Rank display helper
  const getRankDisplay = useCallback(
    (rank: string | null | undefined): string => {
      if (!rank) return '';
      return t(`rank.${rank}`, lang);
    },
    [lang]
  );

  return (
    <div className="flex flex-col flex-1 w-full max-w-[400px] mx-auto relative overflow-hidden" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
      {/* Rules Panel */}
      <RulesPanel show={showRules} lang={lang} onClose={() => setShowRules(false)} />

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute top-2 left-2 right-2 z-50 px-3 py-2 rounded-xl backdrop-blur-xl shadow-2xl"
            style={{
              backgroundColor: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs">⚠️</span>
              <span className="text-[11px] font-medium">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== REVOLUTION EFFECT ===== */}
      <AnimatePresence>
        {showRevolutionEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ mixBlendMode: 'difference' }}
          >
            <motion.div
              className="absolute inset-0 bg-white"
              animate={{ opacity: [0, 0.3, 0, 0.2, 0] }}
              transition={{ duration: 2, times: [0, 0.2, 0.5, 0.7, 1] }}
            />
            {REVOLUTION_PARTICLES.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{ left: `${p.left}%`, top: `${p.top}%` }}
                animate={{
                  scale: [0, 2, 0],
                  opacity: [0, 1, 0],
                  x: [0, p.xOffset],
                  y: [0, p.yOffset],
                }}
                transition={{ duration: 1.5, delay: p.delay }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 8-GIRI EFFECT ===== */}
      <AnimatePresence>
        {showEightGiriEffect && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: [0, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-x-0 top-1/2 h-[2px] z-40 pointer-events-none"
            style={{ originX: 0.5 }}
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MIYAKO-OCHI EFFECT ===== */}
      <AnimatePresence>
        {showMiyakoOchiEffect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              className="px-6 py-3 rounded-2xl bg-red-900/30 border border-red-500/30 backdrop-blur-xl"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <span className="text-lg font-bold text-red-400 tracking-wider">
                {t('game.miyakoOchi', lang)}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== GAME BOARD ===== */}
      {isPlaying || isFinished ? (
        <div className="flex flex-col flex-1">
          {/* Top bar - game info */}
          <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-yellow-400 animate-pulse' : ''}`}
                style={{ backgroundColor: isMyTurn ? undefined : 'var(--color-muted)' }}
              />
              <span className="text-[10px] tracking-wider font-mono" style={{ color: 'var(--color-muted)' }}>
                {room.id}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--color-muted)', opacity: 0.5 }}>
                R{roundNumber}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {revolution && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[10px] text-red-400 font-bold tracking-wider"
                >
                  {t('game.revolution', lang)}
                </motion.span>
              )}
              {myRank && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>
                  {getRankDisplay(myRank)}
                </span>
              )}
              {/* Rules button */}
              <button
                onClick={() => setShowRules(true)}
                className="px-2 py-1 rounded-md text-[10px] transition-all duration-200"
                style={{
                  backgroundColor: 'var(--color-glass-bg)',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-muted)',
                }}
              >
                📖
              </button>
              <button
                onClick={onLeave}
                className="px-2 py-1 rounded-md text-[10px] transition-all"
                style={{
                  backgroundColor: 'var(--color-glass-bg)',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-muted)',
                }}
              >
                {t('room.leave', lang)}
              </button>
            </div>
          </div>

          {/* Opponents info */}
          <div className="flex justify-around px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {sortedPlayers
              .filter((p) => p.id !== playerId)
              .map((player) => {
                const isFinishedPlayer = finishOrder.includes(player.id);
                const isCurrentTurn = currentTurn === player.id;
                return (
                  <div key={player.id} className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]" style={{ color: isCurrentTurn ? 'rgba(250,204,21,0.8)' : 'var(--color-muted)' }}>
                        {player.name}
                      </span>
                      {player.isBot && <span className="text-[7px]" style={{ color: 'rgba(168,85,247,0.5)' }}>AI</span>}
                      {isFinishedPlayer && <span className="text-[7px] text-emerald-400/50">✓</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-[1px]">
                        {Array.from({ length: Math.min(player.handCount, 8) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-[5px] h-[8px] rounded-[1px] border"
                            style={{
                              backgroundColor: isFinishedPlayer ? 'rgba(16,185,129,0.2)' : 'var(--color-card-bg)',
                              borderColor: isFinishedPlayer ? 'rgba(16,185,129,0.1)' : 'var(--color-card-border)',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[8px] font-mono" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
                        {player.handCount}
                      </span>
                    </div>
                    {player.rank && (
                      <span className="text-[7px] font-mono" style={{ color: 'var(--color-muted)', opacity: 0.5 }}>
                        {getRankDisplay(player.rank)}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Table area (center) */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3 relative table-glow">
            <AnimatePresence mode="popLayout">
              {tableCards && tableCards.length > 0 && (
                <motion.div
                  key={`table-${tableCards[0].id}-${tableCards.length}`}
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.5 }}
                  className="flex items-center justify-center gap-1"
                >
                  {tableCards.map((card, i) => (
                    <motion.div
                      key={card.id}
                      initial={{
                        opacity: 0,
                        x: (i - (tableCards.length - 1) / 2) * 60,
                        y: -40,
                        rotate: (i * 7 + 3) % 20 - 10,
                      }}
                      animate={{
                        opacity: 1,
                        x: (i - (tableCards.length - 1) / 2) * 30,
                        y: 0,
                        rotate: (i * 5 + 2) % 10 - 5,
                      }}
                      transition={{ type: 'spring', damping: 15, stiffness: 200, mass: 0.8 }}
                      className="w-[44px] h-[62px] rounded-lg backdrop-blur-sm flex flex-col items-center justify-center shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-card-bg), rgba(255,255,255,0.02))',
                        border: '1px solid var(--color-card-border)',
                      }}
                    >
                      <span className="text-[13px] font-bold font-mono leading-none" style={{
                        color: card.isJoker ? '#f87171' : (card.suit === 'heart' || card.suit === 'diamond') ? '#f87171' : 'var(--color-foreground)',
                      }}>
                        {card.isJoker ? '★' : card.rank}
                      </span>
                      <span className="text-[10px] mt-0.5" style={{ color: card.isJoker ? '#f87171' : undefined }}>
                        {card.isJoker ? 'JKR' : card.suit === 'spade' ? '♠' : card.suit === 'heart' ? '♥' : card.suit === 'diamond' ? '♦' : '♣'}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {lastPlayer && tableCards && tableCards.length > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-mono" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
                {lastPlayer.name}
              </motion.p>
            )}

            {isMyTurn && !iAmFinished && !iAmMiyakoOchi ? (
              <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-xs tracking-wider" style={{ color: 'rgba(250,204,21,0.6)' }}>
                {t('game.yourTurn', lang)}
              </motion.p>
            ) : currentPlayer && !iAmFinished && !iAmMiyakoOchi ? (
              <p className="text-xs tracking-wider" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
                {currentPlayer.name}{t('game.turn', lang)}
              </p>
            ) : iAmFinished ? (
              <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs text-emerald-400/60 tracking-wider">
                {t('game.finished', lang)} #{finishOrder.indexOf(playerId) + 1}
              </motion.p>
            ) : iAmMiyakoOchi ? (
              <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs text-red-400/60 tracking-wider">
                {t('game.miyakoOchi', lang)}
              </motion.p>
            ) : null}

            {/* Game finished overlay */}
            {isFinished && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2">
                <div className="px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span className="text-sm font-bold text-emerald-400 tracking-wider">{t('game.gameEnd', lang)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {finishOrder.map((pid, idx) => {
                    const p = room.players.find((pl) => pl.id === pid);
                    if (!p) return null;
                    const rankKey = ['daifugou', 'fugou', 'heimin', 'hinmin', 'daihinmin'][idx];
                    return (
                      <div key={pid} className="flex items-center gap-2 text-[10px]">
                        <span className="font-mono" style={{ color: 'var(--color-muted)', opacity: 0.6 }}>#{idx + 1}</span>
                        <span style={{ color: pid === playerId ? 'var(--color-foreground)' : 'var(--color-muted)' }}>{p.name}</span>
                        <span className="font-mono" style={{ color: 'rgba(16,185,129,0.4)' }}>{t(`rank.${rankKey}`, lang)}</span>
                      </div>
                    );
                  })}
                </div>
                {isHost && (
                  <button
                    onClick={handleNextRound}
                    className="mt-2 px-4 py-2 rounded-xl text-xs transition-all duration-300 active:scale-[0.98] neon-glow"
                    style={{
                      background: 'linear-gradient(to right, rgba(16,185,129,0.2), rgba(16,185,129,0.1))',
                      border: '1px solid rgba(16,185,129,0.2)',
                      color: 'rgba(16,185,129,0.8)',
                    }}
                  >
                    {t('game.nextRound', lang)}
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Turn timer bar */}
          {isPlaying && !iAmFinished && !iAmMiyakoOchi && turnTimeLeft !== null && (
            <div className="px-4 py-1">
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-glass-bg)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: turnTimeLeft <= 10 ? '#ef4444' : turnTimeLeft <= 20 ? '#f59e0b' : '#22c55e',
                    width: `${(turnTimeLeft / 30) * 100}%`,
                    transition: 'width 1s linear, background-color 0.3s ease',
                  }}
                />
              </div>
              <p className="text-[8px] font-mono text-center mt-0.5" style={{ color: 'var(--color-muted)', opacity: 0.5 }}>
                {turnTimeLeft}s
              </p>
            </div>
          )}

          {/* Action buttons */}
          {isPlaying && !iAmFinished && !iAmMiyakoOchi && (
            <div className="flex items-center justify-center gap-2 px-4 py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setShowRules(true)}
                className="px-3 py-2 rounded-xl text-[10px] tracking-wider transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--color-glass-bg)',
                  border: '1px solid rgba(250,204,21,0.2)',
                  color: 'rgba(250,204,21,0.7)',
                }}
              >
                📖 {t('rules.title', lang)}
              </button>
              <button
                onClick={handlePass}
                disabled={!isMyTurn}
                className="px-4 py-2 rounded-xl text-xs tracking-wider transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: isMyTurn ? 'var(--color-glass-bg)' : 'rgba(255,255,255,0.02)',
                  border: isMyTurn ? '1px solid var(--color-glass-border)' : '1px solid rgba(255,255,255,0.03)',
                  color: isMyTurn ? 'var(--color-muted-strong)' : 'var(--color-muted)',
                  opacity: isMyTurn ? 1 : 0.3,
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                }}
              >
                {t('game.pass', lang)}
              </button>
              <button
                onClick={handlePlayCards}
                disabled={!isMyTurn || selectedCards.size === 0}
                className="px-4 py-2 rounded-xl text-xs tracking-wider transition-all duration-200 active:scale-[0.98] neon-glow"
                style={{
                  background: isMyTurn && selectedCards.size > 0
                    ? 'linear-gradient(to right, rgba(234,179,8,0.2), rgba(217,119,6,0.1))'
                    : 'rgba(255,255,255,0.02)',
                  border: isMyTurn && selectedCards.size > 0
                    ? '1px solid rgba(234,179,8,0.2)'
                    : '1px solid rgba(255,255,255,0.03)',
                  color: isMyTurn && selectedCards.size > 0 ? 'rgba(250,204,21,0.8)' : 'var(--color-muted)',
                  opacity: isMyTurn && selectedCards.size > 0 ? 1 : 0.3,
                  cursor: isMyTurn && selectedCards.size > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                {t('game.play', lang)} ({selectedCards.size})
              </button>
            </div>
          )}

          {/* Player's hand */}
          <div style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-glow)' }}>
            <PlayerHand
              cards={hand}
              selectedCards={selectedCards}
              onToggleSelect={handleToggleSelect}
              isMyTurn={isMyTurn && !iAmFinished && !iAmMiyakoOchi}
              dealing={dealing}
            />
          </div>

          {/* Quick Chat */}
          <div className="relative px-4 py-1.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="relative">
              <button
                onClick={() => setShowChat(!showChat)}
                className="px-2 py-1 rounded-md text-[10px] transition-all"
                style={{ backgroundColor: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)', color: 'var(--color-muted)' }}
              >
                💬
              </button>
              <AnimatePresence>
                {showChat && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 p-2 rounded-xl backdrop-blur-xl shadow-2xl"
                    style={{ backgroundColor: 'rgba(24,24,32,0.95)', border: '1px solid var(--color-glass-border)' }}
                  >
                    {QUICK_CHAT_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => handleQuickChat(key)}
                        className="px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap text-left transition-all"
                        style={{ color: 'var(--color-muted-strong)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-glass-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {t(key, lang)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex gap-2 overflow-hidden">
              <AnimatePresence>
                {chatMessages.slice(-3).map((msg, i) => {
                  const player = room.players.find((p) => p.id === msg.playerId);
                  return (
                    <motion.span
                      key={`${msg.playerId}-${msg.message}-${i}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-[9px] truncate max-w-[120px]"
                      style={{ color: 'var(--color-muted)', opacity: 0.6 }}
                    >
                      {player?.name}: {msg.message}
                    </motion.span>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        /* ===== WAITING ROOM ===== */
        <div className="flex flex-col flex-1 w-full max-w-[400px] mx-auto px-4 py-6 gap-6">
          {/* Room Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: room.status === 'waiting' ? '#4ade80' : room.status === 'playing' ? '#facc15' : '#f87171' }}
                />
                <span className="text-xs tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  {t(`room.${room.status}`, lang)}
                </span>
              </div>
            </div>
            <button
              onClick={onLeave}
              className="px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
              style={{ backgroundColor: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)', color: 'var(--color-muted)' }}
            >
              {t('room.leave', lang)}
            </button>
          </motion.div>

          {/* Room ID */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex flex-col items-center gap-2 py-4">
            <button
              onClick={handleCopyId}
              className="group relative flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300"
              style={{ backgroundColor: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)' }}
            >
              <span className="text-2xl font-bold tracking-[0.3em]" style={{ color: 'var(--color-foreground)', opacity: 0.9 }}>
                {room.id}
              </span>
              <span className="text-[10px] transition-colors" style={{ color: 'var(--color-muted)' }}>
                {copied ? t('room.copied', lang) : t('room.copyId', lang)}
              </span>
            </button>
            <span className="text-[10px]" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
              {room.players.length}/{room.maxPlayers} {t('room.players', lang)}
            </span>
          </motion.div>

          {/* Players */}
          <div className="flex-1 space-y-2">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300"
                style={{
                  backgroundColor: player.id === playerId ? 'var(--color-glass-strong-bg)' : 'var(--color-glass-bg)',
                  borderColor: player.id === playerId ? 'var(--color-glass-strong-border)' : 'var(--color-glass-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-glass-bg)' }}>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
                      {player.seatIndex + 1}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: player.id === playerId ? 'var(--color-foreground)' : 'var(--color-muted-strong)' }}>
                        {player.name}
                      </span>
                      {player.id === playerId && (
                        <span className="text-[10px]" style={{ color: 'rgba(96,165,250,0.6)' }}>
                          ({t('room.you', lang)})
                        </span>
                      )}
                      {player.isBot && (
                        <span className="text-[10px]" style={{ color: 'rgba(168,85,247,0.6)' }}>
                          {t('room.bot', lang)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {room.hostId === player.id && (
                        <span className="text-[10px]" style={{ color: 'rgba(234,179,8,0.5)' }}>
                          {t('room.host', lang)}
                        </span>
                      )}
                      {!player.isConnected && !player.isBot && (
                        <span className="text-[10px]" style={{ color: 'rgba(239,68,68,0.5)' }}>
                          {t('game.disconnected', lang)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {player.isBot && isHost && (
                  <button
                    onClick={() => onRemoveBot(room.id, player.id)}
                    className="px-2 py-1 rounded-md text-[10px] transition-all"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.6)' }}
                  >
                    {t('room.removeBot', lang)}
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Waiting message */}
          {room.players.length < 2 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-center"
              style={{ color: 'var(--color-muted)', opacity: 0.5 }}
            >
              {t('room.waitingForPlayers', lang)}
            </motion.p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {canAddBot && (
              <button
                onClick={() => onAddBot(room.id)}
                className="w-full py-2 rounded-xl text-xs transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--color-glass-bg)',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-muted-strong)',
                }}
              >
                + {t('room.addBot', lang)}
              </button>
            )}
            {canStart ? (
              <button
                onClick={handleStartGame}
                className="w-full py-2 rounded-xl text-xs tracking-wider transition-all duration-200 active:scale-[0.98] neon-glow"
                style={{
                  background: 'linear-gradient(to right, rgba(16,185,129,0.2), rgba(16,185,129,0.1))',
                  border: '1px solid rgba(16,185,129,0.2)',
                  color: 'rgba(16,185,129,0.8)',
                }}
              >
                {t('room.startGame', lang)}
              </button>
            ) : (
              <p className="text-[10px] text-center" style={{ color: 'var(--color-muted)', opacity: 0.5 }}>
                {room.players.length < 2 ? t('room.minPlayers', lang) : t('game.waitingHost', lang)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
