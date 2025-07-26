export type WeatherCondition =
  | "clear"
  | "rain"
  | "driftingSnow"
  | "lightSnow"
  | "heavySnow"
  | "freezingRain"
  | "sleet";

export type SnowRemovalMethod =
  | "plow"
  | "shovel"
  | "noAction"
  | "salt"
  | "combination";

export type FollowUpPlan =
  | "allClear"
  | "activeSnowfall"
  | "monitorConditions"
  | "returnInHour"
  | "callSupervisor";

export type WeatherTrend = "up" | "down" | "steady";

export type CompanyRole = "owner" | "admin" | "manager" | "employee";

export type SubscriptionPlan = "trial" | "basic" | "premium" | "enterprise";

// Webhook event types for RAM Tracking integration
export type WebhookEventType =
  | "ARRIVED"
  | "STOPPED"
  | "DRIVING"
  | "DEPARTED"
  | "SPEEDING"
  | "MAINTENANCE"
  | "JOB_COMPLETED"
  | string; // Allow other event types

export type WebhookEvent = {
  id: string;
  event_type: WebhookEventType;
  vehicle_id: string;
  timestamp: string;
  location: string;
  latitude: number;
  longitude: number;
  speed: number;
  distance_from_site?: number; // Distance in km from the report site
  raw_payload?: Record<string, unknown>;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: string;
  trial_ends_at?: string;
  max_employees: number;
  max_sites: number;
  features: Record<string, unknown>;
  billing_address?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanySettings = {
  company_id: string;
  timezone: string;
  date_format: string;
  time_format: string;
  currency: string;
  material_cost_per_kg: number;
  require_gps_verification: boolean;
  allow_draft_editing_hours: number;
  auto_submit_after_hours?: number;
  notification_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CompanyInvitation = {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  invitation_code: string;
  invited_by?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
};

export type Site = {
  id: string;
  company_id: string;
  name: string;
  address: string;
  priority: "high" | "medium" | "low";
  size_sqft: number;
  typical_salt_usage_kg: number;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
  special_instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  company_id: string;
  user_id: string;
  employee_number: string;
  phone?: string;
  role: CompanyRole;
  vehicle_assignments: string[];
  site_assignments: string[];
  is_active: boolean;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  hired_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type SnowRemovalReport = {
  id: string;
  employee_id: string;
  site_id: string;
  date: string;

  // General Information
  operator: string;
  truck?: string;
  tractor?: string;
  handwork?: string;
  dispatched_for: string; // Time

  // Conditions on Arrival
  conditions_upon_arrival: WeatherCondition;
  follow_up_plans: FollowUpPlan;

  // Forecast Data
  daytime_high: number; // Celsius
  daytime_low: number; // Celsius
  weather_forecast_id?: string;

  // Site Information
  site_name: string;
  start_time: string;
  finish_time?: string;
  air_temperature: number; // Celsius
  temperature_trend: WeatherTrend;

  // Current Weather Conditions
  snowfall_accumulation_cm: number;
  precipitation_type: WeatherCondition;
  salt_used_kg: number;
  deicing_material_kg: number;
  salt_alternative_kg: number;
  snow_removal_method: SnowRemovalMethod;

  // Manual fields
  comments?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  is_draft: boolean;

  // Geolocation (matching database schema)
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;

  // Weather automation data
  weather_data?: {
    api_source: string;
    temperature: number;
    precipitation: number;
    wind_speed: number;
    conditions: string;
    forecast_confidence: number;
  };

  // Auto-calculation data
  calculations?: {
    salt_recommendation_kg: number;
    material_cost_estimate: number;
    temperature_factor: number;
    condition_factor: number;
    cost_per_kg: number;
  };

  // Webhook events data (RAM Tracking integration)
  webhook_events?: WebhookEvent[];
  webhook_events_count?: number;
};

export type WeatherApiResponse = {
  temperature: number;
  conditions: WeatherCondition;
  precipitation: number;
  snowfall: number;
  wind_speed: number;
  trend: WeatherTrend;
  forecast_confidence: number;
};

export type CreateReportRequest = Omit<
  SnowRemovalReport,
  "id" | "created_at" | "updated_at" | "employee_id"
>;

export type UpdateReportRequest = Partial<CreateReportRequest> & {
  id: string;
};

export type CreateCompanyRequest = {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  subscription_plan?: SubscriptionPlan;
};

export type UpdateCompanyRequest = Partial<CreateCompanyRequest> & {
  id: string;
};

export type CreateEmployeeRequest = {
  user_id: string;
  employee_number: string;
  phone?: string;
  role: CompanyRole;
  vehicle_assignments?: string[];
  site_assignments?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  hired_date?: string;
  notes?: string;
};

export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest> & {
  id: string;
};

export type CreateSiteRequest = {
  name: string;
  address: string;
  priority: "high" | "medium" | "low";
  size_sqft: number;
  typical_salt_usage_kg: number;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
  special_instructions?: string;
};

export type UpdateSiteRequest = Partial<CreateSiteRequest> & {
  id: string;
};

export type CreateInvitationRequest = {
  email: string;
  role: CompanyRole;
};

export type CompanyStats = {
  total_employees: number;
  active_employees: number;
  total_sites: number;
  active_sites: number;
  total_reports: number;
  submitted_reports: number;
  draft_reports: number;
  reports_this_month: number;
  average_salt_usage: number;
  total_material_cost: number;
};

// Extended types for API responses
export type SnowRemovalReportWithRelations = SnowRemovalReport & {
  sites: Pick<Site, "name" | "address" | "priority">;
  employees: Pick<Employee, "employee_number" | "role">;
};

export type EmployeeWithUser = Employee & {
  user: {
    name?: string;
    email?: string;
    image?: string;
  };
};

export type SiteWithStats = Site & {
  report_count?: number;
  last_report_date?: string;
  average_salt_usage?: number;
};
