'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/lib/socket';
import { t, getLanguage, setLanguage } from '@/lib/i18n';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import type { Language } from '@/lib/types';
import LoadingOverlay from '@/components/LoadingOverlay';
import BossKey from '@/components/BossKey';
import Lobby from '@/components/Lobby';
import Room from '@/components/Room';

function AppContent() {
  const [lang, setLang] = useState<Language>('ja');
  const {
    status,
    room,
    playerId,
    playerName,
    error,
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
    createRoom,
    joinRoom,
    addBot,
    removeBot,
    startGame,
    playCards,
    passTurn,
    nextRound,
    sendChat,
    leaveRoom,
  } = useSocket();

  // Initialize language from localStorage
  useEffect(() => {
    const savedLang = getLanguage();
    if (savedLang !== 'ja') {
      setLang(savedLang);
    }
  }, []);

  const toggleLang = useCallback(() => {
    const newLang: Language = lang === 'ja' ? 'en' : 'ja';
    setLang(newLang);
    setLanguage(newLang);
  }, [lang]);

  // Show loading overlay when connecting (after 3s timeout)
  const showLoading = status === 'connecting';

  return (
    <>
      {/* Boss Key overlay (double Esc) */}
      <BossKey lang={lang} />

      {/* Loading overlay (server wake-up) */}
      <LoadingOverlay show={showLoading} lang={lang} />

      {/* Main App */}
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Center title (only show when not in room) */}
          {!room && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs tracking-widest font-mono"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('app.title', lang)}
            </motion.span>
          )}

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all duration-200"
            style={{
              backgroundColor: 'var(--color-glass-bg)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-muted)',
            }}
          >
            <span style={{ color: lang === 'ja' ? 'var(--color-muted-strong)' : 'var(--color-muted)', opacity: lang === 'ja' ? 0.8 : 0.3 }}>
              JA
            </span>
            <span style={{ opacity: 0.2 }}>/</span>
            <span style={{ color: lang === 'en' ? 'var(--color-muted-strong)' : 'var(--color-muted)', opacity: lang === 'en' ? 0.8 : 0.3 }}>
              EN
            </span>
          </button>
        </header>

        {/* Content */}
        <main className="flex flex-col flex-1">
          <AnimatePresence mode="wait">
            {room && playerId ? (
              <motion.div
                key="room"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col flex-1"
              >
                <Room
                  lang={lang}
                  room={room}
                  playerId={playerId}
                  playerName={playerName || ''}
                  hand={hand}
                  currentTurn={currentTurn}
                  revolution={revolution}
                  tableCards={tableCards}
                  lastPlayedBy={lastPlayedBy}
                  finishOrder={finishOrder}
                  roundNumber={roundNumber}
                  myRank={myRank}
                  miyakoOchi={miyakoOchi}
                  gameEvent={gameEvent}
                  chatMessages={chatMessages}
                  error={error}
                  onAddBot={addBot}
                  onRemoveBot={removeBot}
                  onStartGame={startGame}
                  onPlayCards={playCards}
                  onPassTurn={passTurn}
                  onNextRound={nextRound}
                  onSendChat={sendChat}
                  onLeave={leaveRoom}
                />
              </motion.div>
            ) : (
              <motion.div
                key="lobby"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col flex-1"
              >
                <Lobby
                  lang={lang}
                  onCreateRoom={createRoom}
                  onJoinRoom={joinRoom}
                  error={error}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="px-4 py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-[10px] text-center font-mono" style={{ color: 'var(--color-muted)', opacity: 0.5 }}>
            {status === 'connected' ? '●' : '○'} {status}
          </p>
        </footer>
      </div>
    </>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-90"
      style={{
        backgroundColor: 'var(--color-glass-bg)',
        border: '1px solid var(--color-glass-border)',
        color: 'var(--color-muted)',
      }}
    >
      <span className="text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  );
}

export default function ClientApp() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
