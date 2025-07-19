import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { ProfilePictureSettings } from "@/components/profile-picture-settings";
import { getUserProfile } from "@/lib/services/supabase-service";

interface UserData {
  id: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userData = await getUserProfile(session.user.id);

  return (
    <AppLayout>
      <div className="container py-8 mx-4 lg:mx-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>
        <div className="space-y-8">
          <ProfilePictureSettings
            userData={userData as UserData}
            userId={session.user.id}
          />
        </div>
      </div>
    </AppLayout>
  );
}
