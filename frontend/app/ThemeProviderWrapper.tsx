'use client';

import { ThemeProvider } from '@/lib/ThemeContext';
import type { ReactNode } from 'react';

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
