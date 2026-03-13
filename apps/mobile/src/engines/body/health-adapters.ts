import { Platform } from 'react-native';
import {
  getAppleHealthSnapshot,
  getAppleHealthStatus,
  requestAppleHealthPermissions,
} from './apple-health';
import { todayStr } from './utils';

export type HealthAdapterId = 'manual' | 'healthkit' | 'health_connect' | 'whoop';

export interface DailyHealthSnapshot {
  date: string;
  steps: number | null;
  sleep_minutes: number | null;
  sleep_start?: string | null;
  sleep_end?: string | null;
  source: HealthAdapterId;
}

export interface HealthAdapterStatus {
  id: HealthAdapterId;
  label: string;
  available: boolean;
  connected?: boolean;
  status: string;
}

export interface HealthAdapter {
  id: HealthAdapterId;
  label: string;
  isAvailable: () => Promise<boolean>;
  getTodaySnapshot: () => Promise<DailyHealthSnapshot | null>;
  getStatus: () => Promise<HealthAdapterStatus>;
  requestAccess?: () => Promise<HealthAdapterStatus>;
}

export const manualHealthAdapter: HealthAdapter = {
  id: 'manual',
  label: 'Manual entry',
  async isAvailable() {
    return true;
  },
  async getTodaySnapshot() {
    return {
      date: todayStr(),
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
    const status = await getAppleHealthStatus();
    return status.available;
  },
  async getTodaySnapshot() {
    return getAppleHealthSnapshot();
  },
  async getStatus() {
    const status = await getAppleHealthStatus();
    return {
      id: 'healthkit',
      label: 'Apple Health',
      available: status.available,
      connected: status.connected,
      status: status.status,
    };
  },
  async requestAccess() {
    const status = await requestAppleHealthPermissions();
    return {
      id: 'healthkit',
      label: 'Apple Health',
      available: status.available,
      connected: status.connected,
      status: status.status,
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

export async function requestHealthAdapterAccess(id: HealthAdapterId) {
  const adapter = healthAdapters.find((item) => item.id === id);
  if (!adapter?.requestAccess) {
    return adapter?.getStatus() ?? {
      id,
      label: id,
      available: false,
      connected: false,
      status: 'This source cannot be connected from here.',
    };
  }

  return adapter.requestAccess();
}
