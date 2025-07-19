import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { OnboardingData } from "../onboarding-flow";
import { useEffect, useRef } from "react";
import { useFormContext as useStepFormContext } from "../form-context";

const nameSchema = z.object({
  name: z.string().min(1, "Please enter your name").max(50, "Name is too long"),
});

interface NameStepProps {
  onNext: (data: Partial<OnboardingData>) => void;
}

export function NameStep({ onNext }: NameStepProps) {
  const { setStepValidity } = useStepFormContext();
  const currentStep = 1; // This is the step index for NameStep
  const previousNameRef = useRef<string>("");

  const form = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      name: "",
    },
  });

  // Load name from localStorage on mount - this only runs once
  useEffect(() => {
    const savedName = localStorage.getItem("onboardingName");
    if (savedName) {
      form.setValue("name", savedName);
      // Mark as valid since we have a name
      setStepValidity(currentStep, true);
      previousNameRef.current = savedName;
    } else {
      // No name in localStorage, so mark as invalid
      setStepValidity(currentStep, false);
    }
  }, []); // Empty dependency array to run only once

  const onSubmit = (values: z.infer<typeof nameSchema>) => {
    // Save name to localStorage
    localStorage.setItem("onboardingName", values.name);
    setStepValidity(currentStep, true); // Ensure valid on successful submit
    onNext({ name: values.name });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2  ">
        <h2 className="text-2xl font-bold">What should we call you?</h2>
      </div>

      <div className=" ">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Enter your name"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const value = e.target.value;
                          const isNameValid =
                            !!value && value.trim().length > 0;

                          // Store in localStorage when changed
                          if (isNameValid) {
                            localStorage.setItem("onboardingName", value);
                          } else {
                            // If not valid, we might want to remove it from localStorage
                            // But that's a UX decision - here we keep it for now
                          }

                          setStepValidity(currentStep, isNameValid);
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      <div className="text-center text-muted-foreground text-sm mt-2  animate__delay-2s">
        We&apos;ll use this to personalize your experience
      </div>
    </div>
  );
}
