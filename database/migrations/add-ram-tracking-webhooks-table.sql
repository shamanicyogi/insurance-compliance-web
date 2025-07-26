-- Migration: Add webhook_events table for storing RAM Tracking webhook data
-- This table will store all incoming webhook events from RAM Tracking

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source VARCHAR(50) NOT NULL DEFAULT 'ram_tracking',
    event_type VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(100),
    location TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    speed DECIMAL(8,2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_vehicle_id ON webhook_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_timestamp ON webhook_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Geospatial indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_latitude ON webhook_events(latitude);
CREATE INDEX IF NOT EXISTS idx_webhook_events_longitude ON webhook_events(longitude);
CREATE INDEX IF NOT EXISTS idx_webhook_events_lat_lng ON webhook_events(latitude, longitude);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_type_vehicle ON webhook_events(source, event_type, vehicle_id);

-- Composite index for location and date queries (your use case)
-- Note: Using timestamp directly instead of DATE() function to avoid IMMUTABLE function error
CREATE INDEX IF NOT EXISTS idx_webhook_events_location_timestamp ON webhook_events(latitude, longitude, timestamp);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_location_timestamp ON webhook_events(source, latitude, longitude, timestamp);

-- Add RLS (Row Level Security) if needed
-- ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhook_events_updated_at
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_events_updated_at();

-- Add comments for documentation
COMMENT ON TABLE webhook_events IS 'Stores webhook events from external services like RAM Tracking';
COMMENT ON COLUMN webhook_events.source IS 'The source service that sent the webhook (e.g., ram_tracking)';
COMMENT ON COLUMN webhook_events.event_type IS 'The type of event (e.g., vehicle_arrived, speed_violation)';
COMMENT ON COLUMN webhook_events.vehicle_id IS 'The ID of the vehicle involved in the event';
COMMENT ON COLUMN webhook_events.location IS 'The location where the event occurred';
COMMENT ON COLUMN webhook_events.speed IS 'Vehicle speed at the time of the event (if applicable)';
COMMENT ON COLUMN webhook_events.timestamp IS 'When the event occurred according to the webhook payload';
COMMENT ON COLUMN webhook_events.raw_payload IS 'The complete webhook payload as received';
COMMENT ON COLUMN webhook_events.processed IS 'Whether this webhook has been processed by our application';
COMMENT ON COLUMN webhook_events.processed_at IS 'When the webhook was processed'; 