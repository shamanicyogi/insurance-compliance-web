import { Suspense } from "react";
import { JoinPageContent } from "./join-content";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
