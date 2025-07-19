import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * OnboardingButton component
 *
 * A specialized button used across the onboarding flow with consistent styling.
 * Automatically applies the height (h-[50px]) and other styling needed for onboarding buttons.
 */
export function OnboardingButton({
  className,
  variant = "secondary",
  active,
  ...props
}: ButtonProps) {
  return (
    <Button
      variant={variant}
      active={active}
      className={cn("h-[50px]", className)}
      {...props}
    />
  );
}
