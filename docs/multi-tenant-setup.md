# Multi-Tenant Snow Removal System Setup

Your snow removal system now supports **multiple companies** in a single database! Each company's data is completely isolated and secure.

## 🏢 **What's New: Multi-Tenancy**

### **Company Isolation**

- Each company has its own sites, employees, and reports
- Employees can only see data from their company
- Row Level Security (RLS) ensures data separation
- Different subscription plans per company

### **Role-Based Access**

- **Owner**: Full company control + billing
- **Admin**: Employee management, settings
- **Manager**: View all company reports, manage sites
- **Employee**: Create reports for assigned sites

## 🗄️ **Database Migration**

### **Step 1: Run New Schema**

Replace your existing schema with the multi-tenant version:

```sql
-- Run this in Supabase SQL editor
-- Copy contents from: database/migrations/snow-removal-schema-multi-tenant.sql
```

### **Step 2: Migrate Existing Data (if any)**

If you have existing single-tenant data:

```sql
-- Create a default company for existing data
INSERT INTO companies (name, slug, subscription_plan)
VALUES ('Your Company Name', 'your-company', 'basic');

-- Get the company ID
SELECT id FROM companies WHERE slug = 'your-company';

-- Update existing sites (replace 'COMPANY-UUID-HERE' with actual ID)
UPDATE sites SET company_id = 'COMPANY-UUID-HERE' WHERE company_id IS NULL;

-- Update existing employees
UPDATE employees SET company_id = 'COMPANY-UUID-HERE' WHERE company_id IS NULL;
```

## 🏗️ **Setting Up Your First Company**

### **Option 1: Manual Setup**

```sql
-- 1. Create your company
INSERT INTO companies (name, slug, address, phone, email, subscription_plan)
VALUES (
  'Acme Snow Removal',
  'acme-snow-removal',
  '123 Winter St, Snow City, ST 12345',
  '555-SNOW',
  'info@acmesnow.com',
  'premium'
);

-- 2. Add sites for your company
INSERT INTO sites (company_id, name, address, priority, size_sqft, typical_salt_usage_kg)
SELECT
  c.id,
  'Main Office Complex',
  '123 Business Ave, City, ST 12345',
  'high',
  50000,
  100.0
FROM companies c WHERE c.slug = 'acme-snow-removal';

-- 3. Create employee profiles (after users sign up)
INSERT INTO employees (company_id, user_id, employee_number, role, site_assignments)
SELECT
  c.id,
  'USER-UUID-HERE',  -- Replace with actual user UUID
  'EMP001',
  'admin',
  ARRAY['SITE-UUID-HERE']  -- Replace with actual site UUIDs
FROM companies c WHERE c.slug = 'acme-snow-removal';
```

### **Option 2: Admin Interface (Coming Soon)**

We'll add a web interface for company setup and management.

## 🔐 **User Onboarding Flow**

### **For New Companies:**

1. **Company owner signs up** → Creates account
2. **Creates company** → Sets up company profile
3. **Invites employees** → Sends invitation codes
4. **Employees join** → Accept invitations, get assigned to sites

### **For Existing Companies:**

1. **Employee gets invitation code** → From company admin
2. **Signs up with code** → Links to correct company
3. **Gets site assignments** → Can start creating reports

## 🚀 **Company Management Features**

### **Company Dashboard**

- **Company stats**: Total employees, sites, reports
- **Recent activity**: Latest reports and employee actions
- **Subscription status**: Plan details and usage limits

### **Employee Management** (Admin/Owner only)

```typescript
// View all company employees
GET /api/snow-removal/companies/{companyId}/employees

// Invite new employee
POST /api/snow-removal/companies/{companyId}/invitations
{
  "email": "newemployee@company.com",
  "role": "employee"
}

// Assign employee to sites
PUT /api/snow-removal/employees/{employeeId}
{
  "site_assignments": ["site-uuid-1", "site-uuid-2"]
}
```

### **Site Management** (Manager+ roles)

```typescript
// View all company sites
GET /api/snow-removal/sites  // Now filtered by company

// Create new site
POST /api/snow-removal/companies/{companyId}/sites
{
  "name": "New Location",
  "address": "123 New St",
  "priority": "medium",
  "size_sqft": 30000
}
```

## 🎯 **Permission System**

### **Data Access Rules:**

- **Sites**: Users only see sites from their company
- **Employees**: Users only see colleagues from their company
- **Reports**: Users only see reports from their company
- **Settings**: Only company admins can modify settings

### **Role Permissions:**

```typescript
// What each role can do:
export const ROLE_PERMISSIONS = {
  employee: {
    canCreateReports: true,
    canEditOwnReports: true,
    canViewAssignedSites: true,
  },
  manager: {
    ...employee,
    canViewAllReports: true,
    canManageSites: true,
    canViewAllSites: true,
  },
  admin: {
    ...manager,
    canManageEmployees: true,
    canInviteEmployees: true,
    canManageSettings: true,
  },
  owner: {
    ...admin,
    canViewBilling: true,
    canDeleteCompany: true,
    canTransferOwnership: true,
  },
};
```

## 🔗 **API Changes**

### **New Endpoints:**

```typescript
// Company management
GET / api / snow - removal / companies / { id };
PUT / api / snow - removal / companies / { id };

// Employee profile
GET / api / snow - removal / employee / profile;
PUT / api / snow - removal / employee / profile;

// Company settings
GET / api / snow - removal / companies / { id } / settings;
PUT / api / snow - removal / companies / { id } / settings;

// Invitations
POST / api / snow - removal / companies / { id } / invitations;
GET / api / snow - removal / companies / { id } / invitations;
```

### **Updated Endpoints:**

All existing endpoints now filter by company automatically:

- `/api/snow-removal/reports` - Only company reports
- `/api/snow-removal/sites` - Only company sites
- Material calculations use company-specific pricing

## 🏪 **Multiple Companies per User**

### **Coming in Future Updates:**

- Users can belong to multiple companies
- Company switching interface
- Cross-company reporting (for contractors)

### **Current Limitation:**

- One company per user account
- Use separate accounts for multiple companies

## 🧪 **Testing Multi-Tenancy**

### **Test Data Setup:**

```sql
-- Create test companies
INSERT INTO companies (name, slug) VALUES
  ('Test Company A', 'test-company-a'),
  ('Test Company B', 'test-company-b');

-- Create test employees for each company
-- (After creating user accounts)
```

### **Verification Checklist:**

- [ ] Employee from Company A cannot see Company B's sites
- [ ] Reports are filtered by company
- [ ] Material calculations use company-specific rates
- [ ] Role permissions work correctly
- [ ] RLS policies prevent cross-company access

## 📊 **Billing & Subscriptions**

### **Company-Specific Plans:**

```sql
-- Update company subscription
UPDATE companies
SET
  subscription_plan = 'premium',
  max_employees = 50,
  max_sites = 100
WHERE id = 'company-uuid';
```

### **Usage Limits:**

- **Trial**: 5 employees, 10 sites, 30 days
- **Basic**: 25 employees, 50 sites
- **Premium**: 100 employees, 200 sites
- **Enterprise**: Unlimited + custom features

## 🔧 **Troubleshooting**

### **"Employee not found" errors:**

1. Check user has employee record in database
2. Verify employee belongs to a company
3. Ensure employee is marked as active

### **"Access denied" errors:**

1. Check user's role permissions
2. Verify company_id matches across tables
3. Test RLS policies in Supabase dashboard

### **Data not showing:**

1. Confirm company_id foreign keys are set
2. Check RLS policies are enabled
3. Verify employee has correct site assignments

## 🎉 **Benefits of Multi-Tenancy**

### **For You (SaaS Provider):**

- **One codebase** serves multiple customers
- **Shared infrastructure** reduces costs
- **Centralized updates** for all companies
- **Scalable revenue** model

### **For Your Customers:**

- **Company data isolation** ensures security
- **Role-based access** controls permissions
- **Custom company settings** (pricing, etc.)
- **Independent billing** and subscriptions

Your snow removal system is now ready to serve multiple landscaping companies! 🚀
