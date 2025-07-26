"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Spinner from "@/components/spinner";
import {
  CheckCircle,
  Shield,
  Users,
  ClipboardCheck,
  Eye,
  FileText,
  ArrowRight,
  Star,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Shield className="h-6 w-6 text-primary" />
            SlipCheck
          </Link>
          <nav className="flex items-center space-x-4">
            <Link
              href="/signup"
              className="text-muted-foreground hover:text-foreground"
            >
              Sign up
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-background to-muted/20">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {/* Hero Content */}
              <div className="space-y-8 text-center lg:text-left">
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                    Insurance Compliance{" "}
                    <span className="text-primary">Made Simple</span>
                  </h1>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Streamline insurance compliance and employee monitoring for
                    your business. Ensure every job meets insurance requirements
                    while providing employers with complete visibility and
                    automated reporting.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/signup">
                    <Button size="lg" className="px-8 py-4 text-lg">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-4 text-lg"
                  >
                    View Demo
                  </Button>
                </div>

                <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No setup fees</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Insurance compliant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Real-time monitoring</span>
                  </div>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative">
                <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                  <img
                    src="/images/snow_removal_truck.jpg"
                    alt="Professional snow removal truck in action - SlipCheck insurance compliance monitoring"
                    className="w-full h-auto object-cover"
                    width={600}
                    height={400}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>

                {/* Floating badges */}
                <div className="absolute -bottom-4 -left-4 bg-background border border-border rounded-lg shadow-lg p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Insurance Compliant</span>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 bg-background border border-border rounded-lg shadow-lg p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <span>Live Monitoring</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Everything You Need for Insurance Compliance
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Powerful tools that make compliance effortless for employees and
                provide complete oversight for employers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-4 p-6 rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Compliance Tracking</h3>
                <p className="text-muted-foreground">
                  Ensure every job meets insurance requirements with automated
                  compliance checks and real-time validation.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Employee Monitoring</h3>
                <p className="text-muted-foreground">
                  Complete visibility into employee activities with GPS
                  tracking, time logs, and job progress monitoring.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Automated Reports</h3>
                <p className="text-muted-foreground">
                  Generate comprehensive reports for insurance claims, audits,
                  and management review automatically.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Risk Management</h3>
                <p className="text-muted-foreground">
                  Identify and mitigate risks before they become claims with
                  proactive monitoring and alerts.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Team Management</h3>
                <p className="text-muted-foreground">
                  Manage employees, assign jobs, track performance, and ensure
                  everyone follows compliance protocols.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Comprehensive insights into compliance rates, employee
                  performance, and operational efficiency.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Built for Modern Businesses
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Reduce liability, improve efficiency, and ensure compliance
                across your entire operation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center p-6 rounded-lg border bg-background space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Reduce Claims</h3>
                <p className="text-muted-foreground">
                  Prevent insurance claims with proactive compliance monitoring
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border bg-background space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">Save Time</h3>
                <p className="text-muted-foreground">
                  Automate compliance checks and reporting processes
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border bg-background space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold">Mitigate Risk</h3>
                <p className="text-muted-foreground">
                  Early warning system for potential compliance issues
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border bg-background space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto">
                  <Star className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold">Improve Quality</h3>
                <p className="text-muted-foreground">
                  Ensure consistent, high-quality work across all jobs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-2xl mx-auto space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Transform Your Compliance?
              </h2>
              <p className="text-xl opacity-90">
                Join businesses who are reducing liability and improving
                efficiency with SlipCheck&apos;s insurance compliance platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="px-8 py-4 text-lg"
                  >
                    Start Free Trial Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm opacity-75">
                14-day free trial • No credit card required • Setup in minutes
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-4">
                <Shield className="h-5 w-5 text-primary" />
                SlipCheck
              </div>
              <p className="text-muted-foreground">
                Insurance compliance and employee monitoring software that makes
                life easier for both employees and employers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    API
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 SlipCheck. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
