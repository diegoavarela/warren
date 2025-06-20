-- Migration: Add multi-source data support
-- Description: Extend file_uploads table and add new tables for multi-year and multi-source data handling

-- Add new columns to file_uploads table
ALTER TABLE file_uploads
ADD COLUMN IF NOT EXISTS data_source_type VARCHAR(50) DEFAULT 'excel',
ADD COLUMN IF NOT EXISTS year_start INTEGER,
ADD COLUMN IF NOT EXISTS year_end INTEGER,
ADD COLUMN IF NOT EXISTS parent_upload_id INTEGER REFERENCES file_uploads(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_year ON file_uploads(user_id, year_start, year_end);
CREATE INDEX IF NOT EXISTS idx_file_uploads_parent ON file_uploads(parent_upload_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_active ON file_uploads(is_active);

-- Create consolidated data views table
CREATE TABLE IF NOT EXISTS data_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    view_type VARCHAR(50) NOT NULL, -- 'multi_year', 'comparison', 'consolidated'
    file_upload_ids INTEGER[] NOT NULL,
    configuration JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for data views
CREATE INDEX idx_data_views_user ON data_views(user_id);
CREATE INDEX idx_data_views_default ON data_views(user_id, is_default);

-- Create data integration logs table
CREATE TABLE IF NOT EXISTS data_integration_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    source_files INTEGER[] NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    result_summary JSONB,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for integration logs
CREATE INDEX idx_integration_logs_user ON data_integration_logs(user_id);
CREATE INDEX idx_integration_logs_status ON data_integration_logs(status);

-- Add comments for documentation
COMMENT ON COLUMN file_uploads.data_source_type IS 'Type of data source: excel, csv, api, quickbooks, etc.';
COMMENT ON COLUMN file_uploads.year_start IS 'Start year for multi-year data files';
COMMENT ON COLUMN file_uploads.year_end IS 'End year for multi-year data files';
COMMENT ON COLUMN file_uploads.parent_upload_id IS 'Reference to parent upload for related files';
COMMENT ON COLUMN file_uploads.is_active IS 'Whether this upload is currently active/included in analysis';
COMMENT ON COLUMN file_uploads.tags IS 'User-defined tags for categorizing uploads';

COMMENT ON TABLE data_views IS 'Stores user-defined views that combine multiple data sources';
COMMENT ON COLUMN data_views.view_type IS 'Type of view: multi_year for year-over-year, comparison for side-by-side, consolidated for merged data';
COMMENT ON COLUMN data_views.file_upload_ids IS 'Array of file upload IDs included in this view';
COMMENT ON COLUMN data_views.configuration IS 'JSON configuration for view settings';

COMMENT ON TABLE data_integration_logs IS 'Logs for data integration operations';
COMMENT ON COLUMN data_integration_logs.integration_type IS 'Type of integration: merge, append, compare, etc.';
COMMENT ON COLUMN data_integration_logs.source_files IS 'Array of file upload IDs that were integrated';