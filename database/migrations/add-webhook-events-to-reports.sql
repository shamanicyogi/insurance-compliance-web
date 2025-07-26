-- Add webhook events columns to snow_removal_reports table
-- This allows storing RAM Tracking vehicle events associated with each report

-- Add columns for webhook events data
ALTER TABLE snow_removal_reports 
ADD COLUMN IF NOT EXISTS webhook_events JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS webhook_events_count INTEGER DEFAULT 0;

-- Add indexes for webhook events queries
CREATE INDEX IF NOT EXISTS idx_reports_webhook_events_count 
ON snow_removal_reports(webhook_events_count) 
WHERE webhook_events_count > 0;

-- Add GIN index for webhook events JSONB queries
CREATE INDEX IF NOT EXISTS idx_reports_webhook_events_gin 
ON snow_removal_reports USING GIN (webhook_events);

-- Add comment for documentation
COMMENT ON COLUMN snow_removal_reports.webhook_events IS 'RAM Tracking vehicle events found within 100m of the site on the report date';
COMMENT ON COLUMN snow_removal_reports.webhook_events_count IS 'Count of webhook events for quick filtering and statistics';

-- Example of webhook_events structure:
-- [
--   {
--     "id": "123e4567-e89b-12d3-a456-426614174000",
--     "event_type": "ARRIVED",
--     "vehicle_id": "12345",
--     "timestamp": "2023-01-10T11:56:09",
--     "location": "Main Office Parking Lot",
--     "latitude": 43.7182,
--     "longitude": -79.4024,
--     "speed": 0,
--     "distance_from_site": 0.05
--   }
-- ] 