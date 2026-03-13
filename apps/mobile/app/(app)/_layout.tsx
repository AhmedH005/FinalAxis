import { Tabs, router, usePathname } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius } from '@axis/theme';
import { appRoutes } from '@/types/navigation';

const TABS = [
  { href: appRoutes.home,     match: '/',         label: 'Today',       icon: 'chart-timeline-variant', iconActive: 'chart-timeline-variant' },
  { href: appRoutes.time,     match: '/time',     label: 'Time Engine', icon: 'calendar-blank-outline', iconActive: 'calendar-blank' },
  { href: appRoutes.body,     match: '/body',     label: 'Body Engine', icon: 'heart-pulse',            iconActive: 'heart-pulse' },
  { href: appRoutes.mind,     match: '/mind',     label: 'Mind Engine', icon: 'brain',                  iconActive: 'brain' },
  { href: appRoutes.settings, match: '/settings', label: 'Settings',    icon: 'cog-outline',            iconActive: 'cog' },
] as const;

function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View style={[bar.container, { paddingBottom: insets.bottom || space.md }]}>
      <View style={bar.inner}>
        {TABS.map((tab) => {
          const focused = tab.match === '/'
            ? pathname === '/'
            : pathname === tab.match || pathname?.startsWith(`${tab.match}/`);
          return (
            <Pressable
              key={tab.href}
              style={bar.tab}
              onPress={() => router.replace(tab.href)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
            >
              <View style={[bar.iconWrap, focused && bar.iconWrapActive]}>
                <MaterialCommunityIcons
                  name={(focused ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={focused ? color.success : color.text.muted}
                />
              </View>
              <Text numberOfLines={2} style={[bar.label, focused && bar.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const bar = StyleSheet.create({
  container: {
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.outline,
    paddingTop: space.sm,
    paddingHorizontal: space.md,
  },
  inner: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: color.success + '18',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    color: color.text.muted,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelActive: {
    color: color.success,
    fontWeight: '700',
  },
});

export default function AppLayout() {
  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="time" options={{ title: 'Time Engine', popToTopOnBlur: true }} />
      <Tabs.Screen name="body" options={{ title: 'Body Engine', popToTopOnBlur: true }} />
      <Tabs.Screen name="mind" options={{ title: 'Mind Engine', popToTopOnBlur: true }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', popToTopOnBlur: true }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
    </Tabs>
  );
}
