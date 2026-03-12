import { Platform } from 'react-native';

export type HealthAdapterId = 'manual' | 'healthkit' | 'health_connect' | 'whoop';

export interface DailyHealthSnapshot {
  date: string;
  steps: number | null;
  sleep_minutes: number | null;
  source: HealthAdapterId;
}

export interface HealthAdapterStatus {
  id: HealthAdapterId;
  label: string;
  available: boolean;
  status: string;
}

export interface HealthAdapter {
  id: HealthAdapterId;
  label: string;
  isAvailable: () => Promise<boolean>;
  getTodaySnapshot: () => Promise<DailyHealthSnapshot | null>;
  getStatus: () => Promise<HealthAdapterStatus>;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const manualHealthAdapter: HealthAdapter = {
  id: 'manual',
  label: 'Manual entry',
  async isAvailable() {
    return true;
  },
  async getTodaySnapshot() {
    return {
      date: todayKey(),
      steps: null,
      sleep_minutes: null,
      source: 'manual',
    };
  },
  async getStatus() {
    return {
      id: 'manual',
      label: 'Manual entry',
      available: true,
      status: 'Always available',
    };
  },
};

export const healthKitAdapter: HealthAdapter = {
  id: 'healthkit',
  label: 'Apple Health',
  async isAvailable() {
    return Platform.OS === 'ios' && false;
  },
  async getTodaySnapshot() {
    return null;
  },
  async getStatus() {
    return {
      id: 'healthkit',
      label: 'Apple Health',
      available: false,
      status: Platform.OS === 'ios'
        ? 'Adapter seam is ready; native bridge not connected yet'
        : 'Only available on iPhone',
    };
  },
};

export const healthConnectAdapter: HealthAdapter = {
  id: 'health_connect',
  label: 'Health Connect',
  async isAvailable() {
    return Platform.OS === 'android' && false;
  },
  async getTodaySnapshot() {
    return null;
  },
  async getStatus() {
    return {
      id: 'health_connect',
      label: 'Health Connect',
      available: false,
      status: Platform.OS === 'android'
        ? 'Adapter seam is ready; native bridge not connected yet'
        : 'Only available on Android',
    };
  },
};

export const whoopAdapter: HealthAdapter = {
  id: 'whoop',
  label: 'WHOOP',
  async isAvailable() {
    return false;
  },
  async getTodaySnapshot() {
    return null;
  },
  async getStatus() {
    return {
      id: 'whoop',
      label: 'WHOOP',
      available: false,
      status: 'Not needed yet; add only after native health sources are in place',
    };
  },
};

export const healthAdapters: HealthAdapter[] = [
  healthKitAdapter,
  healthConnectAdapter,
  whoopAdapter,
  manualHealthAdapter,
];

export async function getAvailableHealthAdapters() {
  const entries = await Promise.all(
    healthAdapters.map(async (adapter) => ({
      adapter,
      available: await adapter.isAvailable(),
    })),
  );

  return entries.filter((entry) => entry.available).map((entry) => entry.adapter);
}

export async function getTodayHealthSnapshot() {
  const adapters = await getAvailableHealthAdapters();

  for (const adapter of adapters) {
    const snapshot = await adapter.getTodaySnapshot();
    if (snapshot) return snapshot;
  }

  return null;
}

export async function getHealthAdapterStatuses() {
  return Promise.all(healthAdapters.map((adapter) => adapter.getStatus()));
}
