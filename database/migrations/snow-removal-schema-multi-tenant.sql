-- Multi-Tenant Snow Removal System Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for snow removal system
CREATE TYPE weather_condition AS ENUM (
  'clear',
  'rain',
  'driftingSnow',
  'lightSnow', 
  'heavySnow',
  'freezingRain',
  'sleet'
);

CREATE TYPE snow_removal_method AS ENUM (
  'plow',
  'shovel',
  'noAction',
  'salt',
  'combination'
);

CREATE TYPE follow_up_plan AS ENUM (
  'allClear',
  'activeSnowfall',
  'monitorConditions',
  'returnInHour',
  'callSupervisor'
);

CREATE TYPE weather_trend AS ENUM (
  'up',
  'down',
  'steady'
);

CREATE TYPE site_priority AS ENUM (
  'high',
  'medium',
  'low'
);

CREATE TYPE company_role AS ENUM (
  'owner',
  'admin',
  'manager',
  'employee'
);

CREATE TYPE subscription_plan AS ENUM (
  'trial',
  'basic',
  'premium',
  'enterprise'
);

-- Companies table (NEW)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  subscription_plan subscription_plan DEFAULT 'trial',
  subscription_status TEXT DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  max_employees INTEGER DEFAULT 10,
  max_sites INTEGER DEFAULT 25,
  features JSONB DEFAULT '{}',
  billing_address JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites table (UPDATED with company_id)
CREATE TABLE IF NOT EXISTS sites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  priority site_priority DEFAULT 'medium',
  size_sqft INTEGER,
  typical_salt_usage_kg DECIMAL(10,2),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  contact_phone TEXT,
  special_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table (UPDATED with company_id and role)
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL,
  phone TEXT,
  role company_role DEFAULT 'employee',
  vehicle_assignments TEXT[],
  site_assignments UUID[],
  is_active BOOLEAN DEFAULT true,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  hired_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_company UNIQUE(user_id, company_id),
  CONSTRAINT unique_employee_number_company UNIQUE(employee_number, company_id)
);

-- Company invitations table (NEW)
CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role company_role DEFAULT 'employee',
  invitation_code TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snow removal reports table (company access through employee relationship)
CREATE TABLE IF NOT EXISTS snow_removal_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE RESTRICT,
  site_id UUID REFERENCES sites(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  
  -- General Information
  operator TEXT NOT NULL,
  truck TEXT,
  tractor TEXT,
  handwork TEXT,
  dispatched_for TIME NOT NULL,
  
  -- Conditions on Arrival
  conditions_upon_arrival weather_condition NOT NULL,
  follow_up_plans follow_up_plan NOT NULL,
  
  -- Forecast Data
  daytime_high DECIMAL(5,2),
  daytime_low DECIMAL(5,2),
  weather_forecast_id TEXT,
  
  -- Site Information
  site_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  finish_time TIME,
  air_temperature DECIMAL(5,2),
  temperature_trend weather_trend,
  
  -- Current Weather Conditions
  snowfall_accumulation_cm DECIMAL(5,2) DEFAULT 0,
  precipitation_type weather_condition NOT NULL,
  salt_used_kg DECIMAL(10,2) DEFAULT 0,
  deicing_material_kg DECIMAL(10,2) DEFAULT 0,
  salt_alternative_kg DECIMAL(10,2) DEFAULT 0,
  snow_removal_method snow_removal_method NOT NULL,
  
  -- Manual Fields
  comments TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  is_draft BOOLEAN DEFAULT true,
  
  -- Geolocation
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  gps_accuracy DECIMAL(8,2),
  
  -- Weather API Data (JSON)
  weather_data JSONB,
  
  -- Auto-calculation Data (JSON)
  calculations JSONB,
  
  -- Ensure one report per employee per site per day
  CONSTRAINT unique_daily_report UNIQUE(employee_id, site_id, date)
  
  -- Note: Company consistency between employee and site is enforced by:
  -- 1. Application logic in API routes
  -- 2. RLS policies that filter by company_id  
  -- 3. Database triggers (if needed for additional safety)
);

-- Weather cache table (shared across companies)
CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  date DATE NOT NULL,
  hour INTEGER NOT NULL,
  api_source TEXT NOT NULL,
  weather_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  CONSTRAINT unique_weather_cache UNIQUE(latitude, longitude, date, hour, api_source)
);

-- Company settings table (NEW)
CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  time_format TEXT DEFAULT '24h',
  currency TEXT DEFAULT 'USD',
  material_cost_per_kg DECIMAL(10,2) DEFAULT 0.50,
  require_gps_verification BOOLEAN DEFAULT true,
  allow_draft_editing_hours INTEGER DEFAULT 24,
  auto_submit_after_hours INTEGER,
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company_active ON sites(company_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_active ON employees(company_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_invitations_company ON company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON company_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON company_invitations(email);

CREATE INDEX IF NOT EXISTS idx_reports_employee_date ON snow_removal_reports(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_reports_site_date ON snow_removal_reports(site_id, date);
CREATE INDEX IF NOT EXISTS idx_reports_submitted ON snow_removal_reports(submitted_at) WHERE submitted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_weather_cache_location_date ON weather_cache(latitude, longitude, date);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON weather_cache(expires_at);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_snow_removal_reports_updated_at BEFORE UPDATE ON snow_removal_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE snow_removal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Companies
CREATE POLICY "Users can view companies they belong to" ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company owners and admins can update company" ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- RLS Policies for Sites
CREATE POLICY "Users can view sites from their company" ON sites FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Managers and above can manage sites" ON sites FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager') 
      AND is_active = true
    )
  );

CREATE POLICY "Employees can view assigned sites" ON sites FOR SELECT
  USING (
    id = ANY(
      SELECT UNNEST(site_assignments) 
      FROM employees 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for Employees
CREATE POLICY "Users can view employees from their company" ON employees FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can view and update own employee profile" ON employees FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Managers and above can manage employees" ON employees FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager') 
      AND is_active = true
    )
  );

-- RLS Policies for Company Invitations
CREATE POLICY "Company admins can manage invitations" ON company_invitations FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- RLS Policies for Snow Removal Reports
CREATE POLICY "Users can view reports from their company" ON snow_removal_reports FOR SELECT
  USING (
    employee_id IN (
      SELECT e1.id FROM employees e1
      JOIN employees e2 ON e1.company_id = e2.company_id
      WHERE e2.user_id = auth.uid() AND e2.is_active = true
    )
  );

CREATE POLICY "Employees can create own reports" ON snow_removal_reports FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Employees can update own draft reports" ON snow_removal_reports FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
    AND is_draft = true
  );

CREATE POLICY "Managers can update any company reports" ON snow_removal_reports FOR UPDATE
  USING (
    employee_id IN (
      SELECT e1.id FROM employees e1
      JOIN employees e2 ON e1.company_id = e2.company_id
      WHERE e2.user_id = auth.uid() 
      AND e2.role IN ('owner', 'admin', 'manager')
      AND e2.is_active = true
    )
  );

-- RLS Policies for Weather Cache (shared resource)
CREATE POLICY "Authenticated users can read weather cache" ON weather_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage weather cache" ON weather_cache FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for Company Settings
CREATE POLICY "Company members can view settings" ON company_settings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company admins can manage settings" ON company_settings FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM employees 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- Create a function to generate invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code() RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Create a function to validate company consistency in reports
CREATE OR REPLACE FUNCTION validate_report_company_consistency()
RETURNS TRIGGER AS $$
DECLARE
  employee_company_id UUID;
  site_company_id UUID;
BEGIN
  -- Get employee's company_id
  SELECT company_id INTO employee_company_id
  FROM employees
  WHERE id = NEW.employee_id;
  
  -- Get site's company_id
  SELECT company_id INTO site_company_id  
  FROM sites
  WHERE id = NEW.site_id;
  
  -- Check if both belong to same company
  IF employee_company_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found or inactive';
  END IF;
  
  IF site_company_id IS NULL THEN
    RAISE EXCEPTION 'Site not found or inactive';
  END IF;
  
  IF employee_company_id != site_company_id THEN
    RAISE EXCEPTION 'Employee and site must belong to the same company';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate company consistency
CREATE TRIGGER validate_report_company_consistency_trigger
  BEFORE INSERT OR UPDATE ON snow_removal_reports
  FOR EACH ROW
  EXECUTE FUNCTION validate_report_company_consistency();

-- Create a function to auto-calculate material usage (updated with company settings)
CREATE OR REPLACE FUNCTION calculate_material_usage(
  snowfall_cm DECIMAL,
  site_size_sqft INTEGER,
  temperature DECIMAL,
  conditions weather_condition,
  company_id_param UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  base_rate DECIMAL := 0.5;
  temperature_factor DECIMAL := 1.0;
  condition_factor DECIMAL := 1.0;
  recommended_salt DECIMAL;
  cost_per_kg DECIMAL := 0.50;
BEGIN
  -- Get company-specific cost per kg if available
  IF company_id_param IS NOT NULL THEN
    SELECT COALESCE(material_cost_per_kg, 0.50) INTO cost_per_kg
    FROM company_settings 
    WHERE company_id = company_id_param;
  END IF;
  
  -- Adjust for temperature
  IF temperature < -10 THEN
    temperature_factor := 1.5;
  ELSIF temperature < -5 THEN
    temperature_factor := 1.3;
  ELSIF temperature < 0 THEN
    temperature_factor := 1.1;
  END IF;
  
  -- Adjust for conditions
  CASE conditions
    WHEN 'freezingRain' THEN condition_factor := 1.8;
    WHEN 'heavySnow' THEN condition_factor := 1.4;
    WHEN 'lightSnow' THEN condition_factor := 1.0;
    WHEN 'driftingSnow' THEN condition_factor := 1.2;
    ELSE condition_factor := 0.8;
  END CASE;
  
  -- Calculate recommended salt usage
  recommended_salt := (site_size_sqft / 1000.0) * snowfall_cm * base_rate * temperature_factor * condition_factor;
  
  RETURN jsonb_build_object(
    'salt_recommendation_kg', ROUND(recommended_salt, 2),
    'material_cost_estimate', ROUND(recommended_salt * cost_per_kg, 2),
    'temperature_factor', temperature_factor,
    'condition_factor', condition_factor,
    'cost_per_kg', cost_per_kg
  );
END;
$$ LANGUAGE plpgsql;

-- Insert sample companies (for testing)
INSERT INTO companies (name, slug, address, phone, email) VALUES
  ('Demo Landscaping Inc', 'demo-landscaping', '123 Business St, Demo City, ST 12345', '555-0001', 'info@demolandscaping.com'),
  ('Snow Pro Services', 'snow-pro-services', '456 Winter Ave, Snow City, ST 54321', '555-0002', 'contact@snowpro.com')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample sites for demo company
INSERT INTO sites (company_id, name, address, priority, size_sqft, typical_salt_usage_kg, latitude, longitude) 
SELECT 
  c.id,
  site_name,
  site_address,
  site_priority::site_priority,
  site_size,
  site_salt_usage,
  site_lat,
  site_lng
FROM companies c,
  (VALUES
    ('Main Office Complex', '123 Business Ave, City, State 12345', 'high', 50000, 100.0, 40.7128, -74.0060),
    ('Warehouse District', '456 Industrial Blvd, City, State 12345', 'medium', 75000, 150.0, 40.7589, -73.9851),
    ('Retail Plaza North', '789 Shopping Center Dr, City, State 12345', 'high', 30000, 80.0, 40.7831, -73.9712),
    ('Residential Complex A', '321 Apartment Way, City, State 12345', 'medium', 40000, 90.0, 40.7505, -73.9934),
    ('Emergency Services Building', '654 First Responder St, City, State 12345', 'high', 25000, 60.0, 40.7282, -73.9942)
  ) AS t(site_name, site_address, site_priority, site_size, site_salt_usage, site_lat, site_lng)
WHERE c.slug = 'demo-landscaping'
ON CONFLICT DO NOTHING; 