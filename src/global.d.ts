import type { ConnectionDetails, DashboardData } from './types';

export {};

declare global {
  interface Window {
    api: {
      connect: (details: ConnectionDetails) => Promise<{ connectionId: string; error?: string }>;
      fetchData: (connectionId: string) => Promise<DashboardData | { error: string }>;
      disconnect: (connectionId: string) => Promise<{ success: boolean }>;
    };
  }
}
