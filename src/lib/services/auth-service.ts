import { supabase } from "./supabase-service";
import { useBulkAppStore } from "@/lib/store/bulk-app-store";

export const signUp = async (
  email: string,
  password: string,
  name: string,
  startWeight: number,
  goalWeight: number
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // If successful, create a user profile
  if (data?.user) {
    const { error: profileError } = await supabase.from("users").insert([
      {
        id: data.user.id,
        email,
        name,
        start_weight: startWeight,
        goal_weight: goalWeight,
        target_weekly_gain: 0.5, // Default value
      },
    ]);

    if (profileError) throw profileError;

    // Set the user ID in the store
    useBulkAppStore.getState().setUserId(data.user.id);

    // Fetch all user data
    await useBulkAppStore.getState().fetchUserData();
  }

  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data?.user) {
    // Set the user ID in the store
    useBulkAppStore.getState().setUserId(data.user.id);

    // Fetch all user data
    await useBulkAppStore.getState().fetchUserData();
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;

  // Clear user ID and reset store
  useBulkAppStore.getState().setUserId(null);
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }

  if (data?.user) {
    // Set the user ID in the store
    useBulkAppStore.getState().setUserId(data.user.id);

    // Fetch all user data
    await useBulkAppStore.getState().fetchUserData();

    return data.user;
  }

  return null;
};
