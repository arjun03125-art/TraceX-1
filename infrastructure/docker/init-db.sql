-- Database initialization script
-- Creates extensions and sets up initial configuration

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for better performance (will be created by Alembic migrations)
-- This file is a placeholder for any initial DB setup