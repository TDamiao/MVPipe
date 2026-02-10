export interface ConnectionDetails {
    id: string;
    name: string;
    host?: string;
    port?: number;
    serviceName?: string;
    user?: string;
    password?: string;
    owner?: string; // Optional Owner for filtering
    connectionString?: string;
}

export interface ActiveLoad {
    sid: number;
    username: string;
    owner: string | null;
    machine?: string | null;
    osuser?: string | null;
    operation: string;
    mainTable: string;
    durationSec: number;
    estMB: number;
    cpuPercent?: number;
    impact: 'Baixo' | 'Médio' | 'Alto';
    waitEvent: string;
    sqlText: string;
    locks?: number;
}

export interface DashboardSummary {
    activeSessions: number;
    totalEstMB: number;
    detectedLocks: number;
    topTable: string;
    dbCpuPercent?: number;
}

export interface DashboardData {
    activeLoads: ActiveLoad[];
    summary: DashboardSummary;
    topOffenders: ActiveLoad[];
    timestamp: string;
    error?: string;
}

export type FilterOptions = {
    owner: string;
    minDuration: number;
};
