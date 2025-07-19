import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect } from "react";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { OnboardingData } from "../types";
import { useFormContext as useStepFormContext } from "../form-context";
import { OnboardingButton } from "../onboarding-button";

// Create schema for the sex step
const sexSchema = z.object({
  gender: z.enum(["male", "female"], {
    required_error: "Please select your biological sex",
  }),
});

interface GenderStepProps {
  onNext: (data: Partial<OnboardingData>) => void;
}

export function GenderStep({ onNext }: GenderStepProps) {
  const { setStepValidity } = useStepFormContext();
  const currentStep = 5; // This is the step index for SexStep

  const form = useForm<z.infer<typeof sexSchema>>({
    resolver: zodResolver(sexSchema),
    defaultValues: {
      gender: undefined,
    },
  });

  // Load data from localStorage on component mount - runs only once
  useEffect(() => {
    const savedGender = localStorage.getItem("gender");
    if (savedGender && (savedGender === "male" || savedGender === "female")) {
      form.setValue("gender", savedGender);
      // Mark as valid since we have a gender
      setStepValidity(currentStep, true);
    } else {
      // No gender in localStorage, so mark as invalid
      setStepValidity(currentStep, false);
    }
  }, []); // Empty dependency array to run only once

  const onSubmit = (values: z.infer<typeof sexSchema>) => {
    // Save gender to localStorage
    localStorage.setItem("gender", values.gender);
    setStepValidity(currentStep, true); // Ensure valid on successful submit
    onNext({ gender: values.gender });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2  ">
        <h2 className="text-2xl font-semibold">
          Please select the sex you had when you were born
        </h2>
      </div>

      <div className=" ">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col space-y-3">
                    <OnboardingButton
                      type="button"
                      active={form.watch("gender") === "male"}
                      onClick={() => {
                        field.onChange("male");
                        localStorage.setItem("gender", "male");
                        setStepValidity(currentStep, true);
                        onSubmit({ gender: "male" });
                      }}
                    >
                      <span className="font-medium">Male</span>
                    </OnboardingButton>

                    <OnboardingButton
                      type="button"
                      active={form.watch("gender") === "female"}
                      onClick={() => {
                        field.onChange("female");
                        localStorage.setItem("gender", "female");
                        setStepValidity(currentStep, true);
                        onSubmit({ gender: "female" });
                      }}
                    >
                      <span className="font-medium">Female</span>
                    </OnboardingButton>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </div>
  );
}
