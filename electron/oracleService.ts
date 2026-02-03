import oracledb from 'oracledb';
import { ConnectionDetails, DashboardData, ActiveLoad } from '../src/types';
import ORACLE_QUERIES from '../src/queries';

// Better performance for large result sets
oracledb.fetchAsString = [oracledb.CLOB];

// Store active connections
const connections = new Map<string, oracledb.Connection>();

export function initializeOracleClient(libDir: string) {
    try {
      oracledb.initOracleClient({ libDir: libDir });
      console.log(`OracleDB Thick mode initialized successfully from: ${libDir}`);
    } catch (err) {
      console.error(`Failed to initialize OracleDB in Thick mode from path: ${libDir}`, err);
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
      return { success: true };
    } catch (err) {
      console.error(`Failed to close connection ${connectionId}:`, err);
      // Still remove it from the map
      connections.delete(connectionId);
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
  
    try {
      results = await connection.execute(ORACLE_QUERIES.primary, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (e) {
      console.warn('Primary query failed, attempting fallback query.', e);
      isFallback = true;
      try {
        results = await connection.execute(ORACLE_QUERIES.fallback, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return { error: (fallbackError as Error).message };
      }
    }
  
    const activeLoads: ActiveLoad[] = (results.rows as any[] || []).map(row =>
      processRow(row, isFallback)
    );
    
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
      },
      topOffenders,
      timestamp: new Date().toISOString(),
      error: undefined,
    };
  }
  
  // Helper function to process a single row from the query result
  function processRow(row: any, isFallback: boolean): ActiveLoad {
    const durationSec = row.DURATION_SEC || 0;
    const rowsProcessed = row.ROWS_PROCESSED || 0;
    const bufferGets = row.BUFFER_GETS || 0;
    const diskReads = row.DISK_READS || 0;
    const locks = row.LOCK_COUNT || 0;
  
    // Estimate MB
    let estMB = 0;
    if (!isFallback) {
      // A simple heuristic: buffer gets and disk reads contribute to weight.
      // Adjust multipliers based on typical block size (e.g., 8KB)
      estMB = (bufferGets * 8192) / (1024 * 1024) + (diskReads * 8192) / (1024 * 1024);
    } else {
      estMB = rowsProcessed * 0.001; // Fallback heuristic
    }
    estMB = Math.round(estMB * 100) / 100;
  
    // Heuristic for impact
    const score = durationSec + (estMB * 5) + (locks * 50);
    const impact = score > 400 ? 'Alto' : score > 100 ? 'Médio' : 'Baixo';
  
    // Parse main table and operation
    const sqlText = (row.SQL_TEXT || '').toUpperCase();
    const { operation, mainTable } = parseSql(sqlText);
  
    return {
      sid: row.SID,
      username: row.USERNAME,
      owner: row.OWNER,
      operation,
      mainTable,
      durationSec,
      estMB,
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
  
    const opMatch = sqlText.match(/^(SELECT|INSERT|UPDATE|DELETE|MERGE)/);
    const operation = opMatch ? opMatch[0] : 'N/A';
  
    let tableMatch;
    switch (operation) {
      case 'INSERT':
        tableMatch = sqlText.match(/INTO\s+([A-Z0-9_$.]+)/);
        break;
      case 'UPDATE':
        tableMatch = sqlText.match(/UPDATE\s+([A-Z0-9_$.]+)/);
        break;
      case 'DELETE':
        // DELETE FROM table
        tableMatch = sqlText.match(/FROM\s+([A-Z0-9_$.]+)/);
        break;
      case 'SELECT':
      case 'MERGE':
      default:
        tableMatch = sqlText.match(/FROM\s+([A-Z0-9_$.]+)/);
        break;
    }
  
    const mainTable = tableMatch && tableMatch[1] ? tableMatch[1].replace(/"/g, '') : '(desconhecida)';
  
    return { operation, mainTable };
  }
