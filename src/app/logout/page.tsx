"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";
import Spinner from "@/components/spinner";
const LogoutPage = () => {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return <Spinner />;
};

export default LogoutPage;
