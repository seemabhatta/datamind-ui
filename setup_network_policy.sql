-- Snowflake Network Policy Setup for PAT Authentication
-- Run these commands in your Snowflake console as ACCOUNTADMIN

-- 1. First, let's check the current IP address that Replit is using
-- You can get this by running: curl -s https://httpbin.org/ip

-- 2. Create a network policy allowing Replit's current IP
-- Current Replit IP detected: 104.198.10.103
CREATE OR REPLACE NETWORK POLICY REPLIT_PAT_POLICY
    ALLOWED_IP_LIST = (
        '104.198.10.103/32'   -- Current Replit IP address
    )
    COMMENT = 'Network policy for PAT authentication from Replit';

-- Alternative: More permissive policy if IP changes frequently
-- CREATE OR REPLACE NETWORK POLICY REPLIT_PAT_POLICY
--     ALLOWED_IP_LIST = (
--         '104.198.0.0/16'      -- Broader Google Cloud range (if Replit uses GCP)
--     )
--     COMMENT = 'Network policy for PAT authentication from Replit';

-- 3. Apply the network policy to your PAT user
ALTER USER NL2SQL_CHAT_SVC SET NETWORK_POLICY = 'REPLIT_PAT_POLICY';

-- 4. Verify the policy is applied
SHOW USERS LIKE 'NL2SQL_CHAT_SVC';

-- 5. Test the connection (optional verification queries)
-- SHOW DATABASES;
-- SHOW TABLES IN SCHEMA CORTES_DEMO_2.CORTEX_DEMO;

-- Note: If you need to remove the policy later:
-- ALTER USER NL2SQL_CHAT_SVC UNSET NETWORK_POLICY;
-- DROP NETWORK POLICY REPLIT_PAT_POLICY;