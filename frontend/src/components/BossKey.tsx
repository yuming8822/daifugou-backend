'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface BossKeyProps {
  lang: Language;
}

export default function BossKey({ lang }: BossKeyProps) {
  const [visible, setVisible] = useState(false);
  const lastEscTimeRef = useRef(0);
  const visibleRef = useRef(false);

  // Sync visibleRef with state for socket callback
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      const now = Date.now();
      if (now - lastEscTimeRef.current < 500) {
        // Double Esc pressed - toggle boss key
        const newVisible = !visibleRef.current;
        setVisible(newVisible);
        lastEscTimeRef.current = 0;

        // Notify server to broadcast to other players
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit('bosskey:toggle', { active: newVisible });
        }
      } else {
        lastEscTimeRef.current = now;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Listen for boss key events from other players
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onBossKeyToggle = (data: { active: boolean }) => {
      setVisible(data.active);
    };

    socket.on('bosskey:toggled', onBossKeyToggle);
    return () => {
      socket.off('bosskey:toggled', onBossKeyToggle);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-zinc-950 overflow-y-auto"
        >
          {/* Fake VS Code-like interface */}
          <div className="min-h-screen flex flex-col">
            {/* Title bar */}
            <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {t('bosskey.title', lang)} — Visual Studio Code
              </span>
            </div>

            {/* Sidebar + Content */}
            <div className="flex flex-1">
              {/* Sidebar */}
              <div className="w-52 bg-zinc-900 border-r border-zinc-800 p-3 hidden sm:block">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  EXPLORER
                </div>
                <div className="space-y-1">
                  {[
                    'app',
                    'components',
                    'lib',
                    'public',
                    'styles',
                    'next.config.js',
                    'package.json',
                    'tsconfig.json',
                  ].map((file) => (
                    <div
                      key={file}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer rounded"
                    >
                      <span className="text-zinc-600">
                        {file.includes('.') ? '📄' : '📁'}
                      </span>
                      {file}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 p-6 bg-zinc-950">
                <div className="max-w-3xl mx-auto">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-mono">
                    <span>nextjs-docs</span>
                    <span>/</span>
                    <span className="text-zinc-300">app</span>
                    <span>/</span>
                    <span className="text-zinc-300">router</span>
                    <span>/</span>
                    <span className="text-blue-400">deployment.mdx</span>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                    {t('bosskey.title', lang)}
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mb-8 pb-6 border-b border-zinc-800">
                    <span>Updated: March 2026</span>
                    <span>•</span>
                    <span>Reading time: 12 min</span>
                  </div>

                  {/* Content */}
                  <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
                    <p>{t('bosskey.content', lang)}</p>

                    <h2 className="text-lg font-semibold text-zinc-100 mt-8">
                      Routing Fundamentals
                    </h2>
                    <p>
                      Next.js App Router uses a file-system based routing
                      paradigm where folders define route segments and files
                      define the UI for each segment.
                    </p>

                    <h2 className="text-lg font-semibold text-zinc-100 mt-8">
                      Server Components
                    </h2>
                    <p>
                      By default, all components in the App Router are React
                      Server Components, reducing JavaScript sent to the client.
                    </p>

                    <h2 className="text-lg font-semibold text-zinc-100 mt-8">
                      Data Fetching
                    </h2>
                    <p>
                      The App Router provides native support for async data
                      fetching in Server Components with automatic streaming.
                    </p>

                    <h2 className="text-lg font-semibold text-zinc-100 mt-8">
                      Deployment
                    </h2>
                    <p>
                      Deploy your Next.js application to Vercel or any Node.js
                      server supporting the Next.js runtime.
                    </p>

                    {/* Code block */}
                    <div className="mt-6 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                        <span className="text-xs text-zinc-500">terminal</span>
                        <span className="text-xs text-zinc-600">bash</span>
                      </div>
                      <pre className="p-4 text-xs text-green-400 font-mono overflow-x-auto">
                        <code>{`$ npx next build

✓  Compiled successfully
✓  Linting and checking validity of types
✓  Collecting page data
✓  Generating static pages (5/5)
✓  Collecting build traces
✓  Finalizing page optimization

Route (app)                              Size     First Load
┌ ○ /                                    5.2 kB         87 kB
├ ○ /api/health                          0 B            87 kB
└ ○ /room/[id]                           3.8 kB         86 kB

+ First Load JS shared by all            87 kB
✓  Ready in 4.2s`}</code>
                      </pre>
                    </div>

                    <p className="text-xs text-zinc-500 mt-8 pt-4 border-t border-zinc-800">
                      Press Esc twice to return to the application.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
