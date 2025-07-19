# Snow Removal Compliance System Setup

This guide will help you set up the snow removal compliance system for your landscaping company.

## Overview

The snow removal system includes:

- **Automated weather data** integration with OpenWeatherMap
- **Employee management** with site assignments
- **Digital compliance forms** with smart calculations
- **Real-time GPS** location tracking
- **Material usage calculations** based on weather conditions
- **Dashboard analytics** for managers

## Prerequisites

1. **Supabase Account** - For database and authentication
2. **OpenWeatherMap API Key** - For weather automation
3. **Google OAuth** (optional) - For employee sign-in

## Database Setup

1. **Run the SQL migration** in your Supabase SQL editor:

   ```sql
   -- Copy and paste the contents of database/migrations/snow-removal-schema.sql
   ```

2. **Verify tables were created:**
   - `sites` - Snow removal locations
   - `employees` - Employee profiles and site assignments
   - `snow_removal_reports` - Daily compliance reports
   - `weather_cache` - Weather API response caching

## Environment Variables

Add these to your `.env.local` file:

```env
# Weather API (Required for automation)
OPENWEATHER_API_KEY=your-openweathermap-api-key

# Your existing variables...
NEXTAUTH_SECRET=your-secret
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# ... etc
```

## OpenWeatherMap Setup

1. **Sign up** at [OpenWeatherMap](https://openweathermap.org/api)
2. **Get your free API key** (1,000 calls/day free tier)
3. **Add to environment variables** as `OPENWEATHER_API_KEY`

## Initial Data Setup

### 1. Create Sites

Add your snow removal locations to the `sites` table:

```sql
INSERT INTO sites (name, address, priority, size_sqft, typical_salt_usage_kg, latitude, longitude) VALUES
('Main Office Complex', '123 Business Ave, City, State 12345', 'high', 50000, 100.0, 40.7128, -74.0060),
('Warehouse District', '456 Industrial Blvd, City, State 12345', 'medium', 75000, 150.0, 40.7589, -73.9851);
```

### 2. Set Up Employees

After employees sign up through the auth system, create their employee profiles:

```sql
INSERT INTO employees (user_id, employee_number, phone, site_assignments, vehicle_assignments) VALUES
('user-uuid-here', 'EMP001', '555-1234', ARRAY['site-uuid-1', 'site-uuid-2'], ARRAY['Truck-1', 'Plow-A']);
```

## System Features

### Automated Features

- **Weather Data**: Automatically fetched when employee selects a site
- **Material Calculations**: Salt usage calculated based on:
  - Site size (square feet)
  - Current temperature
  - Weather conditions (snow, ice, etc.)
  - Historical usage patterns
- **GPS Location**: Captured automatically when filling out reports
- **Employee Info**: Auto-filled from session data

### Manual Fields

- Start/finish times
- Equipment used (truck, tractor, handwork)
- Snow removal method
- Follow-up plans
- Comments and observations

### Smart Calculations

The system uses this formula for salt recommendations:

```
recommended_salt = (site_size_sqft / 1000) × snowfall_cm × base_rate × temperature_factor × condition_factor
```

Factors adjust based on:

- **Temperature**: More salt needed when colder
- **Conditions**: Freezing rain requires more material than light snow

## User Roles

### Employees

- Create and submit daily reports
- View their own reports history
- Access only assigned sites
- Cannot edit submitted reports

### Admins (via Supabase RLS)

- View all reports and analytics
- Manage sites and employee assignments
- Access to raw weather data and calculations

## Navigation

The snow removal system is accessible via:

- **Desktop/Tablet**: Snow Removal link in sidebar navigation
- **URL**: `/snow-removal`

## Compliance Features

### Data Integrity

- GPS coordinates captured for location verification
- Timestamps prevent backdating
- Weather data sourced from official APIs
- Material calculations logged for audit trail

### Reporting

- Daily compliance reports
- Filter by date, site, employee, status
- Export capabilities for insurance/legal purposes
- Historical trend analysis

## Troubleshooting

### Weather Data Not Loading

1. Check OpenWeatherMap API key is valid
2. Verify site has latitude/longitude coordinates
3. Check API rate limits (1,000 calls/day on free tier)

### Site Assignments Not Working

1. Verify employee record exists in `employees` table
2. Check `site_assignments` array contains correct site UUIDs
3. Ensure sites are marked as `is_active = true`

### Form Validation Errors

- All required fields marked with `*` must be completed
- Times must be in valid format (HH:MM)
- Numeric fields only accept positive numbers
- Site selection required before weather data loads

## Security

- **Row Level Security (RLS)** ensures employees only see their own data
- **API authentication** required for all database operations
- **Weather data cached** to prevent API key exposure
- **GPS data encrypted** in transit and at rest

## Support

For technical issues:

1. Check browser console for JavaScript errors
2. Verify all environment variables are set
3. Test database connectivity in Supabase dashboard
4. Review server logs for API errors

For business questions:

- Contact your system administrator
- Review company snow removal procedures
- Check site-specific requirements and priorities
