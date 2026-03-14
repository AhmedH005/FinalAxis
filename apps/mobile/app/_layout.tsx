import { useEffect, useRef } from 'react';
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

  // Keep latest segments/router in refs so the effect doesn't re-run on every navigation —
  // it should only react to auth state changes (session, profile, loading).
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    const routeSegments = segmentsRef.current as readonly string[];
    const inAuthGroup = routeSegments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        routerRef.current.replace(authRoutes.welcome);
      }
      return;
    }

    if (profile && !profile.onboarding_done) {
      const inOnboarding = routeSegments.includes('onboarding');
      if (!inOnboarding) {
        routerRef.current.replace(authRoutes.onboardingProfile);
      }
      return;
    }

    if (!inAuthGroup) return;

    routerRef.current.replace(appRoutes.home);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, loading]);

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
