import { createContext, useContext, useState, ReactNode } from "react";

type StepValidityMap = Record<number, boolean>;

interface FormContextType {
  stepValidity: StepValidityMap;
  setStepValidity: (step: number, isValid: boolean) => void;
  isCurrentStepValid: (step: number) => boolean;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export function FormProvider({ children }: { children: ReactNode }) {
  const [stepValidity, setStepValidityState] = useState<StepValidityMap>({});

  const setStepValidity = (step: number, isValid: boolean) => {
    setStepValidityState((prev) => ({
      ...prev,
      [step]: isValid,
    }));
  };

  const isCurrentStepValid = (step: number) => {
    return stepValidity[step] === true;
  };

  return (
    <FormContext.Provider
      value={{ stepValidity, setStepValidity, isCurrentStepValid }}
    >
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a FormProvider");
  }
  return context;
}
