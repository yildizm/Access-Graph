'use client';

import { SessionProvider } from 'next-auth/react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <SessionProvider>{children}</SessionProvider>
    </MantineProvider>
  );
}