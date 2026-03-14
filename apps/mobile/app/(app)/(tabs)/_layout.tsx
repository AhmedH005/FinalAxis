import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, radius, space } from '@axis/theme';

const TAB_META = {
  index: {
    title: 'Today',
    icon: 'chart-timeline-variant',
    activeIcon: 'chart-timeline-variant',
  },
  time: {
    title: 'Time Engine',
    icon: 'calendar-blank-outline',
    activeIcon: 'calendar-blank',
  },
  body: {
    title: 'Body Engine',
    icon: 'heart-pulse',
    activeIcon: 'heart-pulse',
  },
  mind: {
    title: 'Mind Engine',
    icon: 'brain',
    activeIcon: 'brain',
  },
  settings: {
    title: 'Settings',
    icon: 'cog-outline',
    activeIcon: 'cog',
  },
} as const;

type TabIconProps = { color: string; focused: boolean };

function makeTabIcon(active: string, inactive: string) {
  return function TabIcon({ color: c, focused }: TabIconProps) {
    return (
      <MaterialCommunityIcons
        name={(focused ? active : inactive) as never}
        size={22}
        color={c}
      />
    );
  };
}

const IndexIcon = makeTabIcon(TAB_META.index.activeIcon, TAB_META.index.icon);
const TimeIcon = makeTabIcon(TAB_META.time.activeIcon, TAB_META.time.icon);
const BodyIcon = makeTabIcon(TAB_META.body.activeIcon, TAB_META.body.icon);
const MindIcon = makeTabIcon(TAB_META.mind.activeIcon, TAB_META.mind.icon);
const SettingsIcon = makeTabIcon(TAB_META.settings.activeIcon, TAB_META.settings.icon);

const SCREEN_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: color.success,
  tabBarInactiveTintColor: color.text.muted,
  tabBarStyle: {
    backgroundColor: color.surface,
    borderTopColor: color.outline,
    borderTopWidth: 1,
    paddingTop: space.xs,
    height: 72,
  },
  tabBarItemStyle: {
    paddingVertical: 2,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  tabBarIconStyle: {
    marginTop: 2,
  },
  tabBarBadgeStyle: {
    borderRadius: radius.pill,
  },
};

export default function TabsLayout() {
  return (
    <Tabs screenOptions={SCREEN_OPTIONS}>
      <Tabs.Screen
        name="index"
        options={{
          title: TAB_META.index.title,
          tabBarIcon: IndexIcon,
          tabBarLabel: TAB_META.index.title,
        }}
      />
      <Tabs.Screen
        name="time"
        options={{
          title: TAB_META.time.title,
          tabBarIcon: TimeIcon,
          tabBarLabel: TAB_META.time.title,
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: TAB_META.body.title,
          tabBarIcon: BodyIcon,
          tabBarLabel: TAB_META.body.title,
        }}
      />
      <Tabs.Screen
        name="mind"
        options={{
          title: TAB_META.mind.title,
          tabBarIcon: MindIcon,
          tabBarLabel: TAB_META.mind.title,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: TAB_META.settings.title,
          tabBarIcon: SettingsIcon,
          tabBarLabel: TAB_META.settings.title,
        }}
      />
    </Tabs>
  );
}
