import React from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center h-[320px] ${className}`}>
      <div className="animate-spin h-8 w-8 border-2 border-secondary-foreground dark:border-primary border-t-transparent rounded-full"></div>
    </div>
  );
}

export default Spinner;
