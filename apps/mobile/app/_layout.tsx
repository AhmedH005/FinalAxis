import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { appRoutes, authRoutes } from '@/types/navigation';

SplashScreen.preventAutoHideAsync();

function RouteGuard() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    const routeSegments = segments as readonly string[];
    const inAuthGroup = routeSegments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace(authRoutes.welcome);
      }
      return;
    }

    if (profile && !profile.onboarding_done) {
      const inOnboarding = routeSegments.includes('onboarding');
      if (!inOnboarding) {
        router.replace(authRoutes.onboardingProfile);
      }
      return;
    }

    if (!inAuthGroup) return;

    router.replace(appRoutes.home);
  }, [session, profile, loading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RouteGuard />
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
