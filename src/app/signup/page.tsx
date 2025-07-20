import { SignUpForm } from "@/components/signup-form";
import Image from "next/image";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Shield className="h-6 w-6 text-primary" />
            SlipCheck
          </Link>
        </div>

        {/* Mobile image - shown above form on mobile, hidden on desktop */}
        <div className="relative h-48 w-full lg:hidden">
          <Image
            src="/images/snow_removal_truck.jpg"
            alt="Image"
            fill
            // className="object-cover rounded-lg dark:brightness-[0.2] dark:grayscale"
          />
        </div>

        <div className="flex flex-1 pt-4 justify-center lg:flex-col lg:items-center lg:justify-center">
          <div className="w-full max-w-xs">
            <SignUpForm />
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop image - hidden on mobile, shown on desktop */}
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/images/snow_removal_truck.jpg"
          alt="Image"
          fill
          className="object-cover"
        />
      </div>
    </div>
  );
}
