# 🧪 Testing Multi-Tenant Snow Removal System

Complete guide to test your multi-tenant system and verify data isolation works correctly.

## **📋 Testing Checklist**

- [ ] Database schema deployed without errors
- [ ] Test companies and sites created
- [ ] User accounts created and linked to employees
- [ ] API endpoints return company-filtered data
- [ ] Data isolation verified (Company A can't see Company B data)
- [ ] Role permissions working correctly
- [ ] Material calculations use company-specific pricing

## **🗄️ Step 1: Database Setup**

### **1.1 Run Main Schema**

```sql
-- In Supabase SQL Editor:
-- Copy and paste: database/migrations/snow-removal-schema-multi-tenant.sql
```

### **1.2 Run Test Data Setup**

```sql
-- In Supabase SQL Editor:
-- Copy and paste: database/test-data-setup.sql
```

### **1.3 Verify Setup**

```sql
-- Check companies created
SELECT name, slug, subscription_plan FROM companies ORDER BY name;

-- Check sites per company
SELECT c.name, count(s.id) as sites FROM companies c
LEFT JOIN sites s ON c.id = s.company_id
GROUP BY c.name ORDER BY c.name;

-- Expected results:
-- Acme Snow Removal: 3 sites
-- Elite Landscaping: 2 sites
-- Pro Winter Services: 1 site
```

## **👥 Step 2: Create Test Users**

### **2.1 Sign Up Test Users**

Create accounts through your app (or manually in Supabase Auth):

```
User 1: alice@acmesnow.com (Acme - Admin)
User 2: bob@acmesnow.com (Acme - Employee)
User 3: carol@elitelandscape.com (Elite - Admin)
User 4: dave@elitelandscape.com (Elite - Employee)
User 5: eve@prowinter.com (Pro - Owner)
```

### **2.2 Link Users to Employees**

After users sign up, get their UUIDs and create employee records:

```sql
-- Get user UUIDs (replace emails with actual ones you created)
SELECT id, email FROM auth.users WHERE email IN (
  'alice@acmesnow.com',
  'bob@acmesnow.com',
  'carol@elitelandscape.com',
  'dave@elitelandscape.com',
  'eve@prowinter.com'
);

-- Create employee records (replace USER-UUID with actual UUIDs)
INSERT INTO employees (company_id, user_id, employee_number, role, site_assignments) VALUES
  -- Acme employees
  ('11111111-1111-1111-1111-111111111111', 'ALICE-USER-UUID', 'ACME001', 'admin',
   ARRAY['a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333']),
  ('11111111-1111-1111-1111-111111111111', 'BOB-USER-UUID', 'ACME002', 'employee',
   ARRAY['a1111111-1111-1111-1111-111111111111']),

  -- Elite employees
  ('22222222-2222-2222-2222-222222222222', 'CAROL-USER-UUID', 'ELITE001', 'admin',
   ARRAY['b1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222']),
  ('22222222-2222-2222-2222-222222222222', 'DAVE-USER-UUID', 'ELITE002', 'employee',
   ARRAY['b1111111-1111-1111-1111-111111111111']),

  -- Pro employee
  ('33333333-3333-3333-3333-333333333333', 'EVE-USER-UUID', 'PRO001', 'owner',
   ARRAY['c1111111-1111-1111-1111-111111111111']);
```

## **🔌 Step 3: API Testing**

### **3.1 Test Employee Profile API**

```bash
# Login as Alice (Acme admin) and test:
curl -X GET http://localhost:3000/api/snow-removal/employee/profile \
  -H "Cookie: your-session-cookie"

# Expected: Should return Alice's employee profile with Acme company info
```

### **3.2 Test Sites API (Data Isolation)**

```bash
# As Alice (Acme) - should see 3 Acme sites
curl -X GET http://localhost:3000/api/snow-removal/sites \
  -H "Cookie: alice-session-cookie"

# As Carol (Elite) - should see 2 Elite sites (NOT Acme sites)
curl -X GET http://localhost:3000/api/snow-removal/sites \
  -H "Cookie: carol-session-cookie"

# Critical: Alice should NOT see Elite sites, Carol should NOT see Acme sites
```

### **3.3 Test Role Permissions**

```bash
# Bob (Acme employee) should only see his assigned site
curl -X GET http://localhost:3000/api/snow-removal/sites \
  -H "Cookie: bob-session-cookie"
# Expected: Only 1 site (Acme HQ Building)

# Alice (Acme admin) should see all Acme sites
curl -X GET http://localhost:3000/api/snow-removal/sites \
  -H "Cookie: alice-session-cookie"
# Expected: All 3 Acme sites
```

### **3.4 Test Report Creation**

```bash
# Create a report as Bob (Acme employee)
curl -X POST http://localhost:3000/api/snow-removal/reports \
  -H "Cookie: bob-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "a1111111-1111-1111-1111-111111111111",
    "date": "2024-01-15",
    "operator": "Bob Smith",
    "dispatched_for": "08:00",
    "conditions_upon_arrival": "lightSnow",
    "follow_up_plans": "monitorConditions",
    "site_name": "Acme HQ Building",
    "start_time": "08:00",
    "air_temperature": -5,
    "temperature_trend": "down",
    "snowfall_accumulation_cm": 5,
    "precipitation_type": "lightSnow",
    "snow_removal_method": "salt",
    "daytime_high": -2,
    "daytime_low": -8
  }'

# Expected: Should create report with Acme company pricing
```

## **🛡️ Step 4: Data Isolation Testing**

### **4.1 Cross-Company Access Tests**

```sql
-- Test 1: Try to access Elite site from Acme employee
-- This should FAIL due to RLS policies

-- Login as Alice (Acme), then try:
SELECT * FROM sites WHERE id = 'b1111111-1111-1111-1111-111111111111';
-- Expected: No results (RLS blocks access)

-- Test 2: Verify each company only sees their data
-- As Alice (Acme):
SELECT count(*) FROM sites; -- Should be 3

-- As Carol (Elite):
SELECT count(*) FROM sites; -- Should be 2
```

### **4.2 Report Data Isolation**

```sql
-- Create reports for different companies, then verify isolation:

-- As Alice (Acme), create a report
INSERT INTO snow_removal_reports (employee_id, site_id, date, operator, dispatched_for, conditions_upon_arrival, follow_up_plans, site_name, start_time, air_temperature, temperature_trend, snowfall_accumulation_cm, precipitation_type, snow_removal_method, daytime_high, daytime_low)
VALUES (
  'ALICE-EMPLOYEE-ID',
  'a1111111-1111-1111-1111-111111111111',
  '2024-01-15',
  'Alice Admin',
  '08:00',
  'heavySnow',
  'returnInHour',
  'Acme HQ Building',
  '08:00',
  -10,
  'down',
  10,
  'heavySnow',
  'combination',
  -5,
  -15
);

-- Then as Carol (Elite), check if she can see Acme reports:
SELECT count(*) FROM snow_removal_reports; -- Should be 0 (her company only)
```

### **4.3 Trigger Validation Test**

```sql
-- Test the company consistency trigger
-- This should FAIL:
INSERT INTO snow_removal_reports (employee_id, site_id, date, operator, dispatched_for, conditions_upon_arrival, follow_up_plans, site_name, start_time, air_temperature, temperature_trend, snowfall_accumulation_cm, precipitation_type, snow_removal_method, daytime_high, daytime_low)
VALUES (
  'ALICE-EMPLOYEE-ID',  -- Acme employee
  'b1111111-1111-1111-1111-111111111111', -- Elite site (wrong company!)
  '2024-01-15',
  'Alice Admin',
  '08:00',
  'clear',
  'allClear',
  'Elite Office Park',
  '08:00',
  0,
  'steady',
  0,
  'clear',
  'noAction',
  5,
  -2
);

-- Expected: ERROR: Employee and site must belong to the same company
```

## **🎯 Step 5: Role Permission Testing**

### **5.1 Manager vs Employee Access**

```bash
# Test with different roles accessing the same endpoints:

# Bob (employee) - should only see assigned sites
curl -X GET http://localhost:3000/api/snow-removal/sites \
  -H "Cookie: bob-session-cookie"

# Alice (admin) - should see ALL company sites
curl -X GET http://localhost:3000/api/snow-removal/sites \
  -H "Cookie: alice-session-cookie"
```

### **5.2 Company Management Access**

```bash
# Alice (admin) should be able to access company details
curl -X GET http://localhost:3000/api/snow-removal/companies/11111111-1111-1111-1111-111111111111 \
  -H "Cookie: alice-session-cookie"

# Bob (employee) should be denied company management access
curl -X PUT http://localhost:3000/api/snow-removal/companies/11111111-1111-1111-1111-111111111111 \
  -H "Cookie: bob-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
# Expected: 403 Forbidden
```

## **💰 Step 6: Company-Specific Pricing Test**

### **6.1 Material Cost Calculations**

```sql
-- Test that each company gets their own pricing:

-- Test Acme pricing (premium: $0.65/kg)
SELECT calculate_material_usage(
  5.0,  -- 5cm snow
  50000, -- 50k sqft
  -5,   -- -5°C
  'lightSnow',
  '11111111-1111-1111-1111-111111111111'::uuid
);

-- Test Pro pricing (budget: $0.45/kg)
SELECT calculate_material_usage(
  5.0,  -- same conditions
  50000,
  -5,
  'lightSnow',
  '33333333-3333-3333-3333-333333333333'::uuid
);

-- Expected: Different cost_per_kg values (0.65 vs 0.45)
```

## **📱 Step 7: Frontend Testing**

### **7.1 Login and Navigation**

1. **Login as Alice** (Acme admin)
2. **Navigate to snow removal section**
3. **Verify you see Acme sites only**
4. **Create a test report**
5. **Logout and login as Carol** (Elite admin)
6. **Verify you see Elite sites only** (no Acme data)

### **7.2 Role-Based UI**

1. **Login as Bob** (Acme employee)
2. **Check that admin features are hidden**
3. **Verify limited site access**
4. **Login as Alice** (Acme admin)
5. **Verify admin features are visible**

## **✅ Step 8: Verification Checklist**

### **Data Isolation ✓**

- [ ] Acme users cannot see Elite data
- [ ] Elite users cannot see Acme data
- [ ] Pro users cannot see other company data
- [ ] Reports are filtered by company
- [ ] Sites are filtered by company

### **Role Permissions ✓**

- [ ] Employees see only assigned sites
- [ ] Admins see all company sites
- [ ] Employees cannot manage company settings
- [ ] Admins can manage company settings

### **API Security ✓**

- [ ] All endpoints require authentication
- [ ] Cross-company access returns 403/404
- [ ] RLS policies block unauthorized data access
- [ ] Database triggers prevent invalid relationships

### **Business Logic ✓**

- [ ] Material calculations use company-specific pricing
- [ ] Company settings are isolated
- [ ] Employee assignments work correctly
- [ ] Report creation validates company membership

## **🚨 Common Issues & Solutions**

### **"Employee not found" Error**

```sql
-- Check if user has employee record:
SELECT u.email, e.* FROM auth.users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'test@example.com';
```

### **"Access denied" Error**

```sql
-- Verify company_id relationships:
SELECT
  e.user_id,
  e.company_id as employee_company,
  c.name as company_name
FROM employees e
JOIN companies c ON e.company_id = c.id
WHERE e.user_id = 'USER-UUID-HERE';
```

### **No Data Showing**

```sql
-- Check RLS policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('sites', 'employees', 'snow_removal_reports');
```

## **🎉 Success Criteria**

Your multi-tenant system is working correctly if:

1. ✅ **Multiple companies exist** with separate data
2. ✅ **Users only see their company's data**
3. ✅ **Role permissions work** as designed
4. ✅ **Cross-company access is blocked** at database level
5. ✅ **Company-specific settings** (pricing) are applied
6. ✅ **All API endpoints respect** company boundaries

**Congratulations!** 🚀 Your snow removal system is now successfully serving multiple companies with complete data isolation!
