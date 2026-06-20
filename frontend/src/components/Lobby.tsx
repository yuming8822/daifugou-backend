'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';

interface LobbyProps {
  lang: Language;
  onCreateRoom: (playerName?: string, maxPlayers?: number) => void;
  onJoinRoom: (roomId: string, playerName?: string) => void;
  error: string | null;
}

export default function Lobby({
  lang,
  onCreateRoom,
  onJoinRoom,
  error,
}: LobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);

  const handleCreate = () => {
    onCreateRoom(playerName || undefined, maxPlayers);
  };

  const handleJoin = () => {
    if (joinRoomId.trim()) {
      onJoinRoom(joinRoomId.trim(), playerName || undefined);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[400px] mx-auto px-4 py-8 gap-8">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
          {t('app.title', lang)}
        </h1>
        <p className="text-xs tracking-wider" style={{ color: 'var(--color-muted)' }}>
          {t('app.subtitle', lang)}
        </p>
      </motion.div>

      {/* Nickname Input */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full"
      >
        <label className="block text-xs mb-2 tracking-wider" style={{ color: 'var(--color-muted)' }}>
          {t('lobby.nickname', lang)}
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder={t('lobby.nickname.placeholder', lang)}
          maxLength={16}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
          style={{
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            color: 'var(--color-foreground)',
          }}
        />
      </motion.div>

      {/* Create Room */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full space-y-3"
      >
        <div className="flex items-center gap-3">
          <label className="text-xs tracking-wider" style={{ color: 'var(--color-muted)' }}>
            {t('lobby.maxPlayers', lang)}:
          </label>
          <div className="flex gap-1">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n)}
                className="px-3 py-1 rounded-lg text-xs transition-all duration-200"
                style={{
                  backgroundColor: maxPlayers === n ? 'var(--color-glass-strong-bg)' : 'var(--color-glass-bg)',
                  border: `1px solid ${maxPlayers === n ? 'var(--color-glass-strong-border)' : 'var(--color-glass-border)'}`,
                  color: maxPlayers === n ? 'var(--color-muted-strong)' : 'var(--color-muted)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="w-full py-3 rounded-xl text-sm tracking-wider transition-all duration-300 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(to right, var(--color-glass-strong-bg), var(--color-glass-bg))',
            border: '1px solid var(--color-glass-border)',
            color: 'var(--color-muted-strong)',
          }}
        >
          {t('lobby.create', lang)}
        </button>
      </motion.div>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center gap-4 w-full"
      >
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        <span className="text-xs" style={{ color: 'var(--color-muted)', opacity: 0.5 }}>or</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
      </motion.div>

      {/* Join Room */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="w-full space-y-3"
      >
        <input
          type="text"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
          placeholder={t('lobby.roomId.placeholder', lang)}
          maxLength={4}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 uppercase tracking-widest text-center"
          style={{
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid var(--color-card-border)',
            color: 'var(--color-foreground)',
          }}
        />
        <button
          onClick={handleJoin}
          disabled={!joinRoomId.trim()}
          className="w-full py-3 rounded-xl text-sm tracking-wider transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--color-glass-bg)',
            border: '1px solid var(--color-glass-border)',
            color: 'var(--color-muted)',
          }}
        >
          {t('lobby.join', lang)}
        </button>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full px-4 py-2 rounded-lg text-xs text-center"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'rgba(239, 68, 68, 0.8)',
          }}
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
