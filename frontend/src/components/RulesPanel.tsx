// ============================================================
// RulesPanel - Glassmorphism modal showing game rules
// ============================================================
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Language } from '@/lib/types';
import { t } from '@/lib/i18n';

interface RulesPanelProps {
  show: boolean;
  lang: Language;
  onClose: () => void;
}

export default function RulesPanel({ show, lang, onClose }: RulesPanelProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-[360px] max-h-[80vh] overflow-y-auto rounded-2xl p-5 backdrop-blur-2xl shadow-2xl"
            style={{
              backgroundColor: 'rgba(20, 20, 28, 0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--color-foreground)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-wider" style={{ color: 'var(--color-muted-strong)' }}>
                📖 {t('rules.title', lang)}
              </h2>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all"
                style={{
                  backgroundColor: 'var(--color-glass-bg)',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 text-[11px] leading-relaxed">
              {/* Basic Rules */}
              <Section title={t('rules.basics', lang)}>
                <p style={{ color: 'var(--color-muted-strong)' }}>
                  {t('rules.basicsDesc', lang)}
                </p>
              </Section>

              {/* Card Types */}
              <Section title={t('rules.cardTypes', lang)}>
                <ul className="space-y-1" style={{ color: 'var(--color-muted-strong)' }}>
                  <li>• {t('rules.single', lang)}</li>
                  <li>• {t('rules.pair', lang)}</li>
                  <li>• {t('rules.triple', lang)}</li>
                  <li>• {t('rules.bomb', lang)}</li>
                  <li>• {t('rules.joker', lang)}</li>
                </ul>
              </Section>

              {/* Revolution */}
              <Section title={t('rules.revolution', lang)}>
                <p style={{ color: 'var(--color-muted-strong)' }}>
                  {t('rules.revolutionDesc', lang)}
                </p>
              </Section>

              {/* 8-Giri */}
              <Section title={t('rules.eightGiri', lang)}>
                <p style={{ color: 'var(--color-muted-strong)' }}>
                  {t('rules.eightGiriDesc', lang)}
                </p>
              </Section>

              {/* Miyako-Ochi */}
              <Section title={t('rules.miyakoOchi', lang)}>
                <p style={{ color: 'var(--color-muted-strong)' }}>
                  {t('rules.miyakoOchiDesc', lang)}
                </p>
              </Section>

              {/* Taxation */}
              <Section title={t('rules.taxation', lang)}>
                <p style={{ color: 'var(--color-muted-strong)' }}>
                  {t('rules.taxationDesc', lang)}
                </p>
              </Section>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full mt-4 py-2 rounded-xl text-xs tracking-wider transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--color-glass-bg)',
                border: '1px solid var(--color-glass-border)',
                color: 'var(--color-muted-strong)',
              }}
            >
              {t('rules.close', lang)}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold mb-1" style={{ color: 'rgba(250,204,21,0.7)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
