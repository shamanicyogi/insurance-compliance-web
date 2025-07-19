import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-4xl font-bold  ">Welcome to Precision</h1>
      <p className="text-xl text-muted-foreground">
        Let&apos;s set up your personalized fitness plan. We&apos;ll help you
        build muscle, burn fat, track nutrition, and gain valuable insights into
        your overall wellness journey.
      </p>
      <div className=" animate__delay-2s">
        <Button onClick={onNext} size="lg">
          Get Started
        </Button>
      </div>
    </div>
  );
}
