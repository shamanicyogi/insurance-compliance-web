import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { ProfileGeneralSettings } from "@/components/profile-general-settings";
// import { MacroCalculator } from "@/components/macro-calculator";
import { getUserProfile } from "@/lib/services/supabase-service";
// import { PushNotificationSettings } from "@/components/push-notification-settings";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userData = await getUserProfile(session.user.id);

  return (
    <AppLayout>
      <div className="container py-8 mx-4 lg:mx-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <div className="space-y-12">
          <div>
            <ProfileGeneralSettings userData={userData} />
          </div>

          {/* <div>
            <h2 className="text-2xl font-semibold mb-4">Nutrition Settings</h2>
            <MacroCalculator />
          </div> */}

          {/* <div>
            <h2 className="text-2xl font-semibold mb-4">Push Notifications</h2>
            <PushNotificationSettings />
          </div> */}
        </div>
      </div>
    </AppLayout>
  );
}
