"use client";
import OnboardingFlow from "@/components/onboarding/onboarding-flow";
import { WelcomeStep } from "@/components/onboarding/steps/welcome-step";
import { NameStep } from "@/components/onboarding/steps/name-step";

import { AccountCreationStep } from "@/components/onboarding/steps/account-creation-step";
import { useState, useEffect } from "react";
import Spinner from "@/components/spinner";

import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  // const { user, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  // Load step from localStorage on mount
  useEffect(() => {
    const savedStep = localStorage.getItem("onboardingStep");
    if (savedStep) {
      setStep(parseInt(savedStep, 10));
    }
    // Mark loading as complete after localStorage check
    setIsLoading(false);
  }, []);

  // Save step to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("onboardingStep", step.toString());
  }, [step]);

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const steps = [
    <WelcomeStep key="welcome" onNext={handleNext} />,
    <NameStep key="name" onNext={handleNext} />,
  ];

  if (!session) {
    steps.push(<AccountCreationStep key="account" />);
  }

  const handleBack = () => setStep((prev) => Math.max(0, prev - 1));

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <OnboardingFlow
      steps={steps}
      step={step}
      setStep={setStep}
      handleBack={handleBack}
      handleNext={handleNext}
      isSubmitting={false}
    />
  );
}
