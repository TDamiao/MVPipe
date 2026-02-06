// The NVL() function is used to handle null values.
// The DECODE() function is used for conditional logic.
// The REGEXP_SUBSTR() function is used to extract the main table from the SQL text.
// The ROUND() function is used to round the estimated MB.
const ORACLE_QUERIES = {
  // Query principal para obter dados detalhados da sessão
  primary: `
    WITH sqltext AS (
      SELECT
        sql_id,
        XMLAGG(XMLELEMENT(e, sql_text) ORDER BY piece).getclobval() AS sql_text
      FROM v$sqltext
      GROUP BY sql_id
    )
    SELECT 
      s.sid, 
      s.username, 
      s.schemaname as owner,
      s.machine,
      s.osuser,
      s.status,
      s.sql_id,
      COALESCE(sa.sql_fulltext, sa.sql_text, st.sql_text) as sql_text,
      s.event,
      s.last_call_et as duration_sec,
      NVL(sa.executions, 0) as executions,
      NVL(sa.rows_processed, 0) as rows_processed,
      NVL(sa.buffer_gets, 0) as buffer_gets,
      NVL(sa.disk_reads, 0) as disk_reads,
      NVL(l.lock_count, 0) as lock_count,
      NVL(ss.value, 0) as cpu_used_cs
    FROM v$session s
    LEFT JOIN v$sqlarea sa ON s.sql_id = sa.sql_id
    LEFT JOIN sqltext st ON s.sql_id = st.sql_id
    LEFT JOIN (
      SELECT ss.sid, ss.value
      FROM v$sesstat ss
      JOIN v$statname sn ON ss.statistic# = sn.statistic#
      WHERE sn.name = 'CPU used by this session'
    ) ss ON s.sid = ss.sid
    LEFT JOIN (
      SELECT session_id, COUNT(*) as lock_count 
      FROM v$lock 
      WHERE block = 1 
      GROUP BY session_id
    ) l ON s.sid = l.session_id
    WHERE s.type = 'USER'
      AND s.status = 'ACTIVE'
      AND s.username IS NOT NULL
      AND s.sql_id IS NOT NULL
      AND s.last_call_et > 5 -- Minimum duration in seconds
  `,
  // Query de fallback caso o principal falhe por falta de permissões
  fallback: `
    SELECT 
      s.sid, 
      s.username, 
      s.schemaname as owner,
      s.machine,
      s.osuser,
      s.status,
      s.sql_id,
      'N/A (no permission on v$sql)' as sql_text,
      s.event,
      s.last_call_et as duration_sec,
      0 as executions,
      0 as rows_processed,
      0 as buffer_gets,
      0 as disk_reads,
      0 as lock_count,
      NVL(ss.value, 0) as cpu_used_cs
    FROM v$session s
    LEFT JOIN (
      SELECT ss.sid, ss.value
      FROM v$sesstat ss
      JOIN v$statname sn ON ss.statistic# = sn.statistic#
      WHERE sn.name = 'CPU used by this session'
    ) ss ON s.sid = ss.sid
    WHERE s.type = 'USER'
      AND s.status = 'ACTIVE'
      AND s.username IS NOT NULL
      AND s.sql_id IS NOT NULL
      AND s.last_call_et > 5 -- Minimum duration in seconds
  `,
  metrics: `
    SELECT
      (SELECT value FROM v$sysmetric WHERE metric_name = 'Host CPU Utilization (%)' AND rownum = 1) AS host_cpu_pct,
      (SELECT value FROM v$sysmetric WHERE metric_name = 'CPU Usage Per Sec' AND rownum = 1) AS cpu_usage_per_sec,
      (SELECT value FROM v$osstat WHERE stat_name = 'NUM_CPUS' AND rownum = 1) AS num_cpus,
      (SELECT value FROM v$parameter WHERE name = 'cpu_count' AND rownum = 1) AS cpu_count
    FROM dual
  `,
  metricsFallback: `
    SELECT
      (SELECT value FROM v$osstat WHERE stat_name = 'BUSY_TIME' AND rownum = 1) AS busy_time,
      (SELECT value FROM v$osstat WHERE stat_name = 'IDLE_TIME' AND rownum = 1) AS idle_time,
      (SELECT value FROM v$osstat WHERE stat_name = 'NUM_CPUS' AND rownum = 1) AS num_cpus,
      (SELECT value FROM v$parameter WHERE name = 'cpu_count' AND rownum = 1) AS cpu_count
    FROM dual
  `,
};

export default ORACLE_QUERIES;
