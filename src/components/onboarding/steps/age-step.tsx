import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { OnboardingData } from "../types";
import { useFormContext as useStepFormContext } from "../form-context";

const ageSchema = z.object({
  age: z
    .string()
    .min(1, "Age is required")
    .refine((val) => !isNaN(Number(val)), {
      message: "Age must be a number",
    })
    .refine((val) => Number(val) >= 18, {
      message: "You must be at least 18 years old",
    })
    .refine((val) => Number(val) <= 100, {
      message: "Age must be 100 or less",
    }),
});

interface AgeStepProps {
  onNext: (data: Partial<OnboardingData>) => void;
}

export function AgeStep({ onNext }: AgeStepProps) {
  const { setStepValidity } = useStepFormContext();
  const currentStep = 2; // Update this to the correct step index for AgeStep

  const form = useForm<z.infer<typeof ageSchema>>({
    resolver: zodResolver(ageSchema),
    defaultValues: {
      age: "",
    },
  });

  // Watch the age field to update validity
  const age = form.watch("age");

  // Update step validity when age changes
  useEffect(() => {
    const isValid = Boolean(
      age && !isNaN(Number(age)) && Number(age) >= 18 && Number(age) <= 100
    );

    setStepValidity(currentStep, isValid);
  }, [age]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedAge = localStorage.getItem("age");
    if (savedAge && !isNaN(Number(savedAge))) {
      form.setValue("age", savedAge);
    }
  }, [form]);

  const onSubmit = (values: z.infer<typeof ageSchema>) => {
    const ageValue = Number(values.age);

    // Store age in localStorage
    localStorage.setItem("age", ageValue.toString());

    // Proceed to next step
    onNext({ age: ageValue });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2  ">
        <h2 className="text-2xl font-bold">How old are you?</h2>
      </div>

      <div className=" ">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Enter your age"
                      {...field}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        e.target.value = value;
                        field.onChange(e);

                        const isAgeValid =
                          !!value &&
                          !isNaN(Number(value)) &&
                          Number(value) >= 18 &&
                          Number(value) <= 100;

                        if (isAgeValid) {
                          localStorage.setItem("age", value);
                        }

                        setStepValidity(currentStep, isAgeValid);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      <div className="text-center text-muted-foreground text-sm  animate__delay-2s">
        Your age helps us calculate more accurate nutritional recommendations
      </div>
    </div>
  );
}
