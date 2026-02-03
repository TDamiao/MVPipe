// The NVL() function is used to handle null values.
// The DECODE() function is used for conditional logic.
// The REGEXP_SUBSTR() function is used to extract the main table from the SQL text.
// The ROUND() function is used to round the estimated MB.
const ORACLE_QUERIES = {
  // Query principal para obter dados detalhados da sessão
  primary: `
    SELECT 
      s.sid, 
      s.username, 
      s.schemaname as owner,
      s.status,
      s.sql_id,
      sa.sql_text,
      s.event,
      s.last_call_et as duration_sec,
      sa.executions,
      sa.rows_processed,
      sa.buffer_gets,
      sa.disk_reads,
      l.lock_count
    FROM v_$session s
    LEFT JOIN v_$sql sa ON s.sql_id = sa.sql_id
    LEFT JOIN (
      SELECT session_id, COUNT(*) as lock_count 
      FROM v_$lock 
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
      s.status,
      s.sql_id,
      'N/A (no permission on v$sql)' as sql_text,
      s.event,
      s.last_call_et as duration_sec,
      0 as executions,
      0 as rows_processed,
      0 as buffer_gets,
      0 as disk_reads,
      0 as lock_count
    FROM v_$session s
    WHERE s.type = 'USER'
      AND s.status = 'ACTIVE'
      AND s.username IS NOT NULL
      AND s.sql_id IS NOT NULL
      AND s.last_call_et > 5 -- Minimum duration in seconds
  `,
};

export default ORACLE_QUERIES;
