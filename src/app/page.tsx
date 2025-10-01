'use client';

import { signIn, useSession } from 'next-auth/react';
import { Button, Title, Text, Center } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return <Center style={{ height: '100vh' }}><Text>Loading...</Text></Center>;
  }

  if (!session) {
    return (
      <Center style={{ height: '100vh', flexDirection: 'column' }}>
        <Title>Google Drive Security Scanner</Title>
        <Text c="dimmed" mt="md" mb="xl">
          Log in to scan your drive for publicly shared files.
        </Text>
        <Button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
          Sign in with Google
        </Button>
      </Center>
    );
  }

  return <Center style={{ height: '100vh' }}><Text>Redirecting...</Text></Center>;
}