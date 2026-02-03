-- Required grants for the MVPipe application to monitor the database.
-- Replace 'YOUR_USERNAME' with the actual database user for the application.

-- To be executed by a user with DBA privileges (e.g., SYS or SYSTEM).

-- Grant access to dynamic performance views
GRANT SELECT ON V_$SESSION TO YOUR_USERNAME;
GRANT SELECT ON V_$SQL TO YOUR_USERNAME;
GRANT SELECT ON V_$LOCK TO YOUR_USERNAME;

-- Allow the user to select from any dictionary table
-- This is a powerful privilege, so it might be preferable to
-- grant access to specific tables if possible.
GRANT SELECT ANY DICTIONARY TO YOUR_USERNAME;
