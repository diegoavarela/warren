-- File Uploads Database Schema for Warren
-- Tracks all file uploads (cashflow, P&L, etc.) for the AI Analysis feature

-- Drop existing tables if they exist
DROP TABLE IF EXISTS file_uploads CASCADE;

-- File uploads tracking table
CREATE TABLE file_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('cashflow', 'pnl', 'other')),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    storage_path TEXT,
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Processing status
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    processing_error TEXT,
    
    -- Data validation results
    is_valid BOOLEAN DEFAULT FALSE,
    validation_errors JSONB,
    data_summary JSONB,
    
    -- Extracted metadata
    period_start DATE,
    period_end DATE,
    months_available INTEGER,
    records_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Unique constraint for active files per user per type
    CONSTRAINT unique_active_file_per_type_per_user 
        EXCLUDE (user_id WITH =, file_type WITH =) WHERE (deleted_at IS NULL)
);

-- Create indexes for performance
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_file_type ON file_uploads(file_type);
CREATE INDEX idx_file_uploads_processing_status ON file_uploads(processing_status);
CREATE INDEX idx_file_uploads_upload_date ON file_uploads(upload_date DESC);
CREATE INDEX idx_file_uploads_deleted_at ON file_uploads(deleted_at);
CREATE INDEX idx_file_uploads_user_type_status 
    ON file_uploads(user_id, file_type, processing_status) 
    WHERE deleted_at IS NULL;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_file_uploads_updated_at
    BEFORE UPDATE ON file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for active file uploads (not deleted)
CREATE OR REPLACE VIEW active_file_uploads AS
SELECT 
    fu.*,
    u.email as user_email,
    u.company_name
FROM file_uploads fu
JOIN users u ON fu.user_id = u.id
WHERE fu.deleted_at IS NULL
ORDER BY fu.upload_date DESC;

-- View for latest successful upload per type per user
CREATE OR REPLACE VIEW latest_file_uploads AS
SELECT DISTINCT ON (user_id, file_type)
    id,
    user_id,
    file_type,
    filename,
    upload_date,
    processing_status,
    is_valid,
    period_start,
    period_end,
    months_available,
    data_summary
FROM file_uploads
WHERE deleted_at IS NULL
    AND processing_status = 'completed'
    AND is_valid = TRUE
ORDER BY user_id, file_type, upload_date DESC;

-- Function to soft delete old uploads when a new one is uploaded
CREATE OR REPLACE FUNCTION soft_delete_old_uploads()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed uploads
    IF NEW.processing_status = 'completed' AND NEW.is_valid = TRUE THEN
        -- Soft delete previous uploads of the same type for the same user
        UPDATE file_uploads
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id
            AND file_type = NEW.file_type
            AND id != NEW.id
            AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to soft delete old uploads
CREATE TRIGGER soft_delete_old_uploads_trigger
    AFTER UPDATE ON file_uploads
    FOR EACH ROW
    WHEN (NEW.processing_status = 'completed' AND NEW.is_valid = TRUE)
    EXECUTE FUNCTION soft_delete_old_uploads();