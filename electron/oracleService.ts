import oracledb from 'oracledb';
import { ConnectionDetails, DashboardData, ActiveLoad } from '../src/types';
import ORACLE_QUERIES from '../src/queries';

// Better performance for large result sets
oracledb.fetchAsString = [oracledb.CLOB];

// Store active connections
const connections = new Map<string, oracledb.Connection>();
const cpuSamples = new Map<string, { lastCpuBySid: Map<number, number>; lastSampleAt: number; numCpus: number }>();
const systemCpuSamples = new Map<string, { busyTime: number; idleTime: number; lastSampleAt: number; numCpus: number }>();

type LogMethod = 'log' | 'warn' | 'error';
const safeConsole = (method: LogMethod, ...args: unknown[]) => {
  try {
    // Guard against EPIPE/broken pipe when stdout is not writable.
    if (process.stdout && !process.stdout.writable) return;
    console[method](...args);
  } catch {
    // Ignore logging failures.
  }
};

export function initializeOracleClient(libDir: string) {
    try {
      oracledb.initOracleClient({ libDir: libDir });
      safeConsole('log', `OracleDB Thick mode initialized successfully from: ${libDir}`);
    } catch (err) {
      safeConsole('error', `Failed to initialize OracleDB in Thick mode from path: ${libDir}`, err);
      // Re-throw the error so the main process can display a dialog box.
      throw err;
    }
}


// Connect to the database
export async function connect(details: ConnectionDetails): Promise<{ connectionId: string; error?: string }> {
  const connectionId = `conn_${Date.now()}`;
  const connectString = details.host && details.port && details.serviceName
    ? `${details.host}:${details.port}/${details.serviceName}`
    : details.connectionString;

  if (!connectString) {
    return { connectionId, error: 'Connection string is missing or incomplete.' };
  }

  try {
    const connection = await oracledb.getConnection({
      user: details.user,
      password: details.password,
      connectString: connectString,
    });
    connections.set(connectionId, connection);
    return { connectionId };
  } catch (err: any) {
    return { connectionId, error: err.message };
  }
}

// Disconnect from the database
export async function disconnect(connectionId: string): Promise<{ success: boolean }> {
  const connection = connections.get(connectionId);
  if (connection) {
    try {
      await connection.close();
      connections.delete(connectionId);
      cpuSamples.delete(connectionId);
      systemCpuSamples.delete(connectionId);
      return { success: true };
    } catch (err) {
      safeConsole('error', `Failed to close connection ${connectionId}:`, err);
      // Still remove it from the map
      connections.delete(connectionId);
      cpuSamples.delete(connectionId);
      systemCpuSamples.delete(connectionId);
      return { success: false };
    }
  }
  return { success: false };
}

// Fetch data from the database
export async function fetchData(connectionId: string): Promise<DashboardData | { error: string }> {
    const connection = connections.get(connectionId);
    if (!connection) {
      return { error: 'Connection not found.' };
    }
  
    let isFallback = false;
    let results;
    const now = Date.now();
    let dbCpuPercent: number | undefined;
    let numCpus = 1;
  
    try {
      results = await connection.execute(ORACLE_QUERIES.primary, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (e: any) {
      const message = e?.message || '';
      if (message.includes('DPI-1010') || message.includes('NJS-003')) {
        // Connection is no longer valid; remove it to stop further usage.
        connections.delete(connectionId);
        return { error: 'Connection lost (DPI-1010/NJS-003). Please reconnect.' };
      }
      safeConsole('warn', 'Primary query failed, attempting fallback query.', e);
      isFallback = true;
      try {
        results = await connection.execute(ORACLE_QUERIES.fallback, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      } catch (fallbackError) {
        safeConsole('error', 'Fallback query also failed:', fallbackError);
        const fallbackMessage = (fallbackError as Error).message || '';
        if (fallbackMessage.includes('DPI-1010') || fallbackMessage.includes('NJS-003')) {
          connections.delete(connectionId);
          return { error: 'Connection lost (DPI-1010/NJS-003). Please reconnect.' };
        }
        return { error: fallbackMessage };
      }
    }

    // Fetch system metrics (best-effort). If sysmetric is not accessible, try OS stats delta.
    try {
      const metricsResult = await connection.execute(ORACLE_QUERIES.metrics, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const metricsRow = (metricsResult.rows as any[] || [])[0] || {};
      const hostCpu = Number(metricsRow.HOST_CPU_PCT);
      const cpuUsagePerSec = Number(metricsRow.CPU_USAGE_PER_SEC);
      const numCpusRaw = Number(metricsRow.NUM_CPUS || metricsRow.CPU_COUNT);
      if (!Number.isNaN(numCpusRaw) && numCpusRaw > 0) {
        numCpus = numCpusRaw;
      }
      if (!Number.isNaN(hostCpu) && hostCpu > 0) {
        dbCpuPercent = Math.max(0, Math.min(100, hostCpu));
      } else if (!Number.isNaN(cpuUsagePerSec) && cpuUsagePerSec > 0) {
        // CPU Usage Per Sec is in centiseconds/sec. Convert to % across CPUs.
        dbCpuPercent = Math.max(0, Math.min(100, cpuUsagePerSec / numCpus));
      }
      if (dbCpuPercent !== undefined && dbCpuPercent <= 0) {
        dbCpuPercent = undefined;
      }
    } catch {
      // Ignore metrics errors; try fallback.
    }

    if (dbCpuPercent === undefined) {
      try {
        const fallbackResult = await connection.execute(ORACLE_QUERIES.metricsFallback, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const fallbackRow = (fallbackResult.rows as any[] || [])[0] || {};
        const busyTime = Number(fallbackRow.BUSY_TIME);
        const idleTime = Number(fallbackRow.IDLE_TIME);
        const numCpusRaw = Number(fallbackRow.NUM_CPUS || fallbackRow.CPU_COUNT);
        if (!Number.isNaN(numCpusRaw) && numCpusRaw > 0) {
          numCpus = numCpusRaw;
        }
        if (!Number.isNaN(busyTime) && !Number.isNaN(idleTime) && busyTime >= 0 && idleTime >= 0) {
          const prev = systemCpuSamples.get(connectionId);
          if (prev) {
            const deltaBusy = Math.max(0, busyTime - prev.busyTime);
            const deltaIdle = Math.max(0, idleTime - prev.idleTime);
            const total = deltaBusy + deltaIdle;
            if (total > 0) {
              dbCpuPercent = Math.max(0, Math.min(100, (deltaBusy / total) * 100));
            }
          }
          systemCpuSamples.set(connectionId, { busyTime, idleTime, lastSampleAt: now, numCpus });
        }
      } catch {
        // Ignore fallback errors; keep undefined.
      }
    }

    const sample = cpuSamples.get(connectionId);
    const intervalSec = sample ? (now - sample.lastSampleAt) / 1000 : 0;
    const totalCapacitySec = intervalSec > 0 ? intervalSec * numCpus : 0;
    const prevCpuBySid = sample?.lastCpuBySid || new Map<number, number>();
    const nextCpuBySid = new Map<number, number>();

    const activeLoads: ActiveLoad[] = (results.rows as any[] || []).map(row =>
      processRow(row, isFallback, prevCpuBySid, nextCpuBySid, totalCapacitySec)
    );

    cpuSamples.set(connectionId, { lastCpuBySid: nextCpuBySid, lastSampleAt: now, numCpus });
    
    // Aggregate data for cards
    const totalEstMB = activeLoads.reduce((sum, load) => sum + load.estMB, 0);
    const totalLocks = activeLoads.reduce((sum, load) => sum + (load.locks || 0), 0);
  
    const tableCounts = activeLoads.reduce((acc, load) => {
        if (load.mainTable !== '(desconhecida)') {
            acc[load.mainTable] = (acc[load.mainTable] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);
  
    const topTable = Object.keys(tableCounts).reduce((a, b) => tableCounts[a] > tableCounts[b] ? a : b, 'N/A');
  
    const topOffenders = [...activeLoads]
      .sort((a, b) => (b.durationSec * 5 + b.estMB * 10) - (a.durationSec * 5 + a.estMB * 10))
      .slice(0, 5);
  
    return {
      activeLoads,
      summary: {
        activeSessions: activeLoads.length,
        totalEstMB,
        detectedLocks: totalLocks,
        topTable,
        dbCpuPercent,
      },
      topOffenders,
      timestamp: new Date().toISOString(),
      error: undefined,
    };
  }
  
  // Helper function to process a single row from the query result
  function processRow(
    row: any,
    isFallback: boolean,
    prevCpuBySid: Map<number, number>,
    nextCpuBySid: Map<number, number>,
    totalCapacitySec: number
  ): ActiveLoad {
    const durationSec = row.DURATION_SEC || 0;
    const rowsProcessed = row.ROWS_PROCESSED || 0;
    const bufferGets = row.BUFFER_GETS || 0;
    const diskReads = row.DISK_READS || 0;
    const locks = row.LOCK_COUNT || 0;
    const cpuUsedCs = row.CPU_USED_CS || 0;

    if (row.SID !== undefined && row.SID !== null) {
      nextCpuBySid.set(row.SID, cpuUsedCs);
    }
  
    // Estimate MB
    let estMB = 0;
    if (!isFallback) {
      // A simple heuristic: buffer gets and disk reads contribute to weight.
      // Adjust multipliers based on typical block size (e.g., 8KB)
      estMB = (bufferGets * 8192) / (1024 * 1024) + (diskReads * 8192) / (1024 * 1024);
      if (estMB === 0 && rowsProcessed > 0) {
        // If stats are missing, approximate from processed rows.
        estMB = rowsProcessed * 0.001;
      }
    } else {
      estMB = rowsProcessed * 0.001; // Fallback heuristic
    }
    if (estMB === 0 && durationSec > 0) {
      // Last-resort heuristic based on duration to avoid all-zero volume.
      estMB = durationSec * 0.01;
    }
    estMB = Math.round(estMB * 100) / 100;
  
    // Heuristic for impact
    const score = durationSec + (estMB * 5) + (locks * 50);
    const impact = score > 400 ? 'Alto' : score > 100 ? 'Médio' : 'Baixo';
  
    // Parse main table and operation
    const sqlText = (row.SQL_TEXT || '').toUpperCase();
    const { operation, mainTable } = parseSql(sqlText);
  
    let cpuPercent: number | undefined;
    if (totalCapacitySec > 0 && row.SID !== undefined && row.SID !== null && prevCpuBySid.has(row.SID)) {
      const prevCpu = prevCpuBySid.get(row.SID) as number;
      const deltaCs = Math.max(0, cpuUsedCs - prevCpu);
      const deltaSec = deltaCs / 100;
      cpuPercent = Math.min(100, Math.max(0, (deltaSec / totalCapacitySec) * 100));
    }
  
    return {
      sid: row.SID,
      username: row.USERNAME,
      owner: row.OWNER,
      machine: row.MACHINE,
      osuser: row.OSUSER,
      operation,
      mainTable,
      durationSec,
      estMB,
      cpuPercent,
      impact,
      waitEvent: row.EVENT,
      sqlText: row.SQL_TEXT,
      locks,
    };
  }
  
  // Helper function to parse SQL text
  function parseSql(sqlText: string): { operation: string; mainTable: string } {
    if (!sqlText || sqlText.startsWith('N/A')) {
      return { operation: 'N/A', mainTable: '(desconhecida)' };
    }
  
    // Normalize and strip comments/hints to improve parsing reliability.
    const normalized = sqlText
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--.*$/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  
    const opMatch = normalized.match(/\b(SELECT|INSERT|UPDATE|DELETE|MERGE)\b/);
    const operation = opMatch ? opMatch[1] : 'N/A';
  
    let tableMatch;
    switch (operation) {
      case 'INSERT':
        tableMatch = normalized.match(/\bINTO\s+([A-Z0-9_$."]+)/);
        break;
      case 'UPDATE':
        tableMatch = normalized.match(/\bUPDATE\s+([A-Z0-9_$."]+)/);
        break;
      case 'DELETE':
        // DELETE FROM table
        tableMatch = normalized.match(/\bFROM\s+([A-Z0-9_$."]+)/);
        break;
      case 'MERGE':
        tableMatch = normalized.match(/\bMERGE\s+INTO\s+([A-Z0-9_$."]+)/);
        break;
      case 'SELECT':
      default:
        tableMatch = normalized.match(/\bFROM\s+([A-Z0-9_$."]+)/);
        break;
    }
  
    if (!tableMatch) {
      // Generic fallback: first INTO/UPDATE/FROM occurrence.
      tableMatch = normalized.match(/\b(INTO|UPDATE|FROM)\s+([A-Z0-9_$."]+)/);
    }
  
    const mainTable = tableMatch && (tableMatch[2] || tableMatch[1])
      ? (tableMatch[2] || tableMatch[1]).replace(/"/g, '')
      : '(desconhecida)';
  
    return { operation, mainTable };
  }
