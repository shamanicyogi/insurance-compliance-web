import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import SubscriptionManagement from "@/components/subscription-management";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <AppLayout>
      <div className="container py-8 mx-4 lg:mx-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Billing</h1>
        <div className="space-y-8">
          <SubscriptionManagement />
        </div>
      </div>
    </AppLayout>
  );
}
