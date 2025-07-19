import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const user = session?.user;

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return {
    user,
    isLoading,
    signOut: handleSignOut,
  };
}
