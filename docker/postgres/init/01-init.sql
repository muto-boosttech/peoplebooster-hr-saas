-- ========================================
-- PeopleBooster Database Initialization
-- ========================================
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Asia/Tokyo';

-- Grant privileges (if needed for additional users)
-- GRANT ALL PRIVILEGES ON DATABASE peoplebooster TO postgres;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'PeopleBooster database initialized successfully at %', NOW();
END $$;
