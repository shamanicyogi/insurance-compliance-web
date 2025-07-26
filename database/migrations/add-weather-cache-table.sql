-- Weather forecast cache table for daily weather data
-- Caches weather data by location and date to avoid redundant API requests
-- Designed for snow removal reports that need daily weather summaries

CREATE TABLE IF NOT EXISTS weather_forecast_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location (rounded to ~1km precision for cache efficiency)
  latitude DECIMAL(6,4) NOT NULL,  -- Rounded to 2 decimal places for caching
  longitude DECIMAL(7,4) NOT NULL, -- Rounded to 2 decimal places for caching
  
  -- Date for the weather forecast (not time-based)
  forecast_date DATE NOT NULL,
  
  -- Cache metadata
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cache_key VARCHAR(150) NOT NULL UNIQUE, -- location_date format
  
  -- Daily weather summary data
  temperature_high DECIMAL(5,2) NOT NULL,
  temperature_low DECIMAL(5,2) NOT NULL,
  temperature_avg DECIMAL(5,2) NOT NULL,
  conditions VARCHAR(50) NOT NULL, -- Dominant condition for the day
  precipitation_total DECIMAL(5,2) DEFAULT 0, -- Total precipitation in mm
  snowfall_total DECIMAL(5,2) DEFAULT 0, -- Total snowfall in cm
  wind_speed_max DECIMAL(5,2) DEFAULT 0,
  wind_speed_avg DECIMAL(5,2) DEFAULT 0,
  
  -- Snow removal specific data
  temperature_trend VARCHAR(20) DEFAULT 'steady', -- up, down, steady
  conditions_morning VARCHAR(50), -- Morning conditions
  conditions_afternoon VARCHAR(50), -- Afternoon conditions
  conditions_evening VARCHAR(50), -- Evening conditions
  
  -- API metadata
  forecast_confidence DECIMAL(3,2) DEFAULT 0.9,
  forecast_id VARCHAR(100), -- OpenWeather forecast ID
  api_source VARCHAR(50) DEFAULT 'openweathermap',
  
  -- Raw API response for debugging/analysis
  raw_forecast_data JSONB,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient daily forecast lookups
CREATE INDEX IF NOT EXISTS idx_weather_forecast_cache_key ON weather_forecast_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_weather_forecast_date_location ON weather_forecast_cache(forecast_date, latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_forecast_date ON weather_forecast_cache(forecast_date);
CREATE INDEX IF NOT EXISTS idx_weather_forecast_location ON weather_forecast_cache(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_forecast_cached_at ON weather_forecast_cache(cached_at);

-- Cleanup function to remove old forecast entries (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_weather_forecasts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep forecasts for last 7 days only
  DELETE FROM weather_forecast_cache 
  WHERE forecast_date < CURRENT_DATE - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create cache key for date-based caching
CREATE OR REPLACE FUNCTION get_weather_cache_key(
  lat DECIMAL(6,4),
  lon DECIMAL(7,4),
  forecast_date DATE
)
RETURNS VARCHAR(150) AS $$
BEGIN
  RETURN 'weather_' || lat || '_' || lon || '_' || forecast_date;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE weather_forecast_cache IS 'Daily weather forecast cache to reduce OpenWeather API calls for snow removal reports';
COMMENT ON COLUMN weather_forecast_cache.cache_key IS 'Unique cache key: weather_{lat}_{lon}_{date}';
COMMENT ON COLUMN weather_forecast_cache.forecast_date IS 'Date for which the weather forecast applies';
COMMENT ON COLUMN weather_forecast_cache.latitude IS 'Latitude rounded to 2 decimal places (~1km precision)';
COMMENT ON COLUMN weather_forecast_cache.longitude IS 'Longitude rounded to 2 decimal places (~1km precision)';
COMMENT ON COLUMN weather_forecast_cache.temperature_high IS 'Highest temperature for the day in Celsius';
COMMENT ON COLUMN weather_forecast_cache.temperature_low IS 'Lowest temperature for the day in Celsius';
COMMENT ON COLUMN weather_forecast_cache.snowfall_total IS 'Total snowfall for the day in centimeters';
COMMENT ON FUNCTION cleanup_old_weather_forecasts IS 'Function to clean up weather forecasts older than 7 days';
COMMENT ON FUNCTION get_weather_cache_key IS 'Function to generate consistent cache keys for date-based weather lookups'; 