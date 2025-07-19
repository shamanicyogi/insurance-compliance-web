-- Test Data Setup for Multi-Tenant Snow Removal System
-- Run this in Supabase SQL Editor AFTER running the main schema

-- 1. Create Test Companies
INSERT INTO companies (id, name, slug, address, phone, email, subscription_plan) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Snow Removal', 'acme-snow', '123 Winter St, Snow City, ST 12345', '555-ACME', 'info@acmesnow.com', 'premium'),
  ('22222222-2222-2222-2222-222222222222', 'Elite Landscaping', 'elite-landscape', '456 Spring Ave, Green City, ST 54321', '555-ELITE', 'contact@elitelandscape.com', 'basic'),
  ('33333333-3333-3333-3333-333333333333', 'Pro Winter Services', 'pro-winter', '789 Cold Blvd, Frost Town, ST 67890', '555-WINTER', 'hello@prowinter.com', 'trial')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Test Sites for Each Company

-- Acme Snow Removal Sites
INSERT INTO sites (id, company_id, name, address, priority, size_sqft, typical_salt_usage_kg, latitude, longitude) VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Acme HQ Building', '100 Corporate Dr, Snow City, ST', 'high', 45000, 120.0, 40.7128, -74.0060),
  ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Acme Warehouse Complex', '200 Storage Rd, Snow City, ST', 'medium', 80000, 200.0, 40.7589, -73.9851),
  ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Acme Retail Plaza', '300 Shopping Center, Snow City, ST', 'high', 35000, 90.0, 40.7831, -73.9712)
ON CONFLICT (id) DO NOTHING;

-- Elite Landscaping Sites  
INSERT INTO sites (id, company_id, name, address, priority, size_sqft, typical_salt_usage_kg, latitude, longitude) VALUES
  ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Elite Office Park', '400 Business Blvd, Green City, ST', 'high', 55000, 140.0, 40.7505, -73.9934),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Elite Shopping Center', '500 Mall Way, Green City, ST', 'medium', 70000, 180.0, 40.7282, -73.9942)
ON CONFLICT (id) DO NOTHING;

-- Pro Winter Services Sites
INSERT INTO sites (id, company_id, name, address, priority, size_sqft, typical_salt_usage_kg, latitude, longitude) VALUES
  ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Pro Main Facility', '600 Winter Way, Frost Town, ST', 'high', 40000, 100.0, 40.6892, -74.0445)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Company Settings
INSERT INTO company_settings (company_id, material_cost_per_kg, require_gps_verification) VALUES
  ('11111111-1111-1111-1111-111111111111', 0.65, true),   -- Acme: Premium pricing
  ('22222222-2222-2222-2222-222222222222', 0.50, true),   -- Elite: Standard pricing  
  ('33333333-3333-3333-3333-333333333333', 0.45, false)   -- Pro: Budget pricing, no GPS required
ON CONFLICT (company_id) DO NOTHING;

-- 4. Verification Queries
-- Check that companies were created
SELECT 'Companies Created:' AS status, count(*) AS count FROM companies;

-- Check sites per company
SELECT 
  c.name AS company_name,
  count(s.id) AS site_count
FROM companies c
LEFT JOIN sites s ON c.id = s.company_id
GROUP BY c.id, c.name
ORDER BY c.name;

-- Check company settings
SELECT 
  c.name AS company_name,
  cs.material_cost_per_kg,
  cs.require_gps_verification
FROM companies c
JOIN company_settings cs ON c.id = cs.company_id
ORDER BY c.name;

-- Test data setup complete!
-- Next: You'll need to create user accounts and link them to employees
-- (This requires actual user signup through your app) 