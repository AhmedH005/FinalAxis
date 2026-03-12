import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';

const TABS = [
  { route: 'index',          label: 'Today',   icon: 'chart-timeline-variant', iconActive: 'chart-timeline-variant' },
  { route: 'time/index',     label: 'Time',    icon: 'calendar-blank-outline', iconActive: 'calendar-blank' },
  { route: 'mind/index',     label: 'Mind',    icon: 'brain',                  iconActive: 'brain' },
  { route: 'settings/index', label: 'Profile', icon: 'account-outline',        iconActive: 'account' },
] as const;

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[bar.container, { paddingBottom: insets.bottom || space.md }]}>
      <View style={bar.inner}>
        {TABS.map((tab, index) => {
          const focused = state.routes[state.index]?.name === tab.route;
          return (
            <Pressable
              key={tab.route}
              style={bar.tab}
              onPress={() => navigation.navigate(tab.route)}
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
              <Text style={[bar.label, focused && bar.labelActive]}>
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
    gap: 3,
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
    fontSize: typography.xs,
    fontWeight: '500',
    color: color.text.muted,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: color.success,
    fontWeight: '700',
  },
});

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="time/index" options={{ title: 'Time' }} />
      <Tabs.Screen name="mind/index" options={{ title: 'Mind' }} />
      <Tabs.Screen name="settings/index" options={{ title: 'Profile' }} />
      <Tabs.Screen name="body" options={{ href: null }} />
      <Tabs.Screen name="time/[blockId]" options={{ href: null }} />
      <Tabs.Screen name="progress/index" options={{ href: null }} />
      <Tabs.Screen name="mind/journal" options={{ href: null }} />
      <Tabs.Screen name="mind/journal/[id]" options={{ href: null }} />
      <Tabs.Screen name="mind/mood" options={{ href: null }} />
      <Tabs.Screen name="mind/habits" options={{ href: null }} />
      <Tabs.Screen name="mind/patterns" options={{ href: null }} />
    </Tabs>
  );
}
