"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  title = "Subscription Required",
  description = "Your free trial has ended. Subscribe now to continue using all features.",
}: PaymentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = () => {
    setLoading(true);
    router.push("/billing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="font-medium">Premium Benefits:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Unlimited meal and workout logging</li>
              <li>Advanced analytics and insights</li>
              <li>Personalized recommendations</li>
              <li>Premium support</li>
            </ul>
          </div>
          <div className="text-sm">
            <span className="font-medium">Price:</span> $9.99/month
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Not Now
          </Button>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading && <Spinner className="mr-2" />}
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
