import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const TermsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <div className="prose prose-invert max-w-none">
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">1. Introduction</h2>
        <p>
          Welcome to SlipCheck! These Terms of Service (&quot;Terms&quot;)
          govern your use of our website and services. By accessing or using our
          service, you agree to be bound by these Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">2. Our Services</h2>
        <p>
          SlipCheck provides a comprehensive snow removal compliance and
          reporting platform designed for snow removal companies and their
          employees. Our services include digital reporting, weather data
          integration, site management, and compliance tracking. Our services
          are provided on an &quot;as is&quot; and &quot;as available&quot;
          basis.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">3. User Accounts</h2>
        <p>
          When you create an account with us, you must provide us with
          information that is accurate, complete, and current at all times.
          Failure to do so constitutes a breach of the Terms, which may result
          in immediate termination of your account on our service.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">4. Subscriptions</h2>
        <p>
          Some parts of the service are billed on a subscription basis. You will
          be billed in advance on a recurring and periodic basis (&quot;Billing
          Cycle&quot;). Subscription plans may include different features and
          limitations based on your selected tier.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">
          5. Content and Reports
        </h2>
        <p>
          Our service allows you to create, store, and manage snow removal
          reports, site information, employee data, and other compliance-related
          content (&quot;Content&quot;). You are responsible for the accuracy
          and completeness of the Content that you submit through the service.
          All reports and data should be truthful and reflect actual snow
          removal activities.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">
          6. Intellectual Property
        </h2>
        <p>
          The Service and its original content (excluding Content provided by
          users), features and functionality are and will remain the exclusive
          property of SlipCheck and its licensors. You retain ownership of your
          company&apos;s data and reports while granting us necessary rights to
          provide the service.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">
          7. Data and Privacy
        </h2>
        <p>
          SlipCheck takes data security and privacy seriously. We implement
          appropriate measures to protect your data and comply with applicable
          data protection regulations. Weather data and location information may
          be collected to enhance reporting accuracy.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">8. Termination</h2>
        <p>
          We may terminate or suspend your account immediately, without prior
          notice or liability, for any reason whatsoever, including without
          limitation if you breach the Terms. Upon termination, you may export
          your data within a reasonable timeframe.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">
          9. Limitation Of Liability
        </h2>
        <p>
          In no event shall SlipCheck, nor its directors, employees, partners,
          agents, suppliers, or affiliates, be liable for any indirect,
          incidental, special, consequential or punitive damages, including but
          not limited to damages related to weather predictions or compliance
          outcomes.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">10. Governing Law</h2>
        <p>
          These Terms shall be governed and construed in accordance with the
          laws of the jurisdiction in which the company is based, without regard
          to its conflict of law provisions.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">11. Changes</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace
          these Terms at any time. We will try to provide at least 30 days&apos;
          notice prior to any new terms taking effect.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-2">12. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us through
          our support channels or reach out to your company administrator.
        </p>
      </div>
    </div>
  );
};

export default TermsPage;
