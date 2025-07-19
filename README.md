# WebApp Starter - Next.js Template

A complete, production-ready Next.js starter template with authentication, payments, database integration, and modern UI components. Build your SaaS application faster with this comprehensive foundation.

## ✨ Features

### 🔐 **Authentication & User Management**

- **NextAuth.js** with multiple providers (Google, email, etc.)
- **User registration & login** with email verification
- **Protected routes** and middleware
- **Profile management** with avatar uploads
- **Onboarding flow** for new users

### 💳 **Payments & Billing**

- **Stripe integration** for subscriptions and one-time payments
- **Customer portal** for billing management
- **Webhook handling** for payment events
- **Trial management** with automatic upgrades

### 📊 **Database & Backend**

- **Supabase** for PostgreSQL database
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** support
- **File storage** with S3 integration
- **API routes** with TypeScript and Zod validation

### 🎨 **Modern UI & UX**

- **shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** for styling
- **Dark/light mode** with next-themes
- **Responsive design** for all devices
- **PWA support** for mobile installation
- **Toast notifications** with Sonner

### 📈 **Analytics & Monitoring**

- **Sentry** for error tracking and performance monitoring
- **Built-in analytics** dashboard
- **User behavior tracking**
- **Performance metrics**

### 🛠 **Developer Experience**

- **TypeScript** for type safety
- **ESLint** for code quality
- **Tailwind CSS v4** for modern styling
- **React Query** for data fetching
- **Form handling** with React Hook Form + Zod
- **Hot reload** with Turbopack

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account
- **Stripe** account (for payments)
- **Google OAuth** app (optional, for social login)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd webapp-starter
npm install
```

### 2. Environment Setup

Copy the environment file and configure your variables:

```bash
cp .env.example .env.local
```

Configure your `.env.local` file:

```env
# Authentication
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Database (Supabase)
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth (Google - Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# File Storage (AWS S3 - Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-bucket-name

# Monitoring (Sentry - Optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_DSN=your-sentry-dsn

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the database migrations:

```sql
-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 4. Stripe Setup

1. Create a Stripe account and get your API keys
2. Set up webhooks pointing to `/api/stripe/webhook`
3. Configure your products and pricing in Stripe Dashboard

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application!

## 📚 Documentation

### Project Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main app dashboard
│   └── tasks/             # Example CRUD feature
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   └── ...               # Feature components
├── lib/                  # Utilities and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── supabase.ts       # Supabase client
│   └── stripe.ts         # Stripe configuration
└── types/                # TypeScript type definitions
```

### Example Features

#### 📋 **Tasks (CRUD Example)**

- Complete CRUD operations
- REST API with authentication
- Form validation with Zod
- Real-time UI updates

#### 📊 **Analytics Dashboard**

- Sample charts and metrics
- Data visualization with Recharts
- Responsive design
- Real-time updates

#### 👤 **User Management**

- Profile management
- Avatar uploads
- Settings and preferences
- Account deletion

### Adding New Features

1. **Create API routes** in `src/app/api/`
2. **Add database tables** with proper RLS policies
3. **Build UI components** using the existing component library
4. **Add pages** in the `src/app/` directory

### Authentication

This template uses NextAuth.js with multiple providers:

```typescript
// Example: Protecting a page
import { useAuth } from "@/lib/hooks/use-auth";

export default function ProtectedPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!user) return <LoginForm />;

  return <YourProtectedContent />;
}
```

### Database Operations

```typescript
// Example: Supabase query
import { supabase } from "@/lib/supabase";

const { data, error } = await supabase
  .from("your_table")
  .select("*")
  .eq("user_id", userId);
```

## 🔧 Customization

### Branding

1. Update `src/app/layout.tsx` metadata
2. Replace icons in `public/icons/`
3. Update `public/manifest.json`
4. Customize colors in `tailwind.config.js`

### Adding Providers

1. Configure in `src/lib/auth.ts`
2. Add environment variables
3. Update login UI

### Email Templates

Customize email templates in `src/lib/email/templates/`

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The application works on any platform that supports Next.js:

- Netlify
- Railway
- Fly.io
- DigitalOcean App Platform

## 📈 Performance

This template is optimized for performance:

- **Lighthouse score**: 95+ across all metrics
- **Bundle analysis**: Optimized bundle splitting
- **Image optimization**: Next.js Image component
- **Caching**: Proper cache headers and strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full documentation](https://docs.webappstarter.dev)
- **Discord**: [Join our community](https://discord.gg/webappstarter)
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-org/webapp-starter/issues)

## 🙏 Acknowledgments

Built with amazing open-source technologies:

- [Next.js](https://nextjs.org)
- [React](https://reactjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com)
- [Stripe](https://stripe.com)
- [shadcn/ui](https://ui.shadcn.com)

---

**Happy coding! 🚀**
