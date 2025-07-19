import React from "react";

// Simple shim for useEffectEvent
export function useEffectEvent(callback) {
  const callbackRef = React.useRef(callback);
  React.useEffect(() => {
    callbackRef.current = callback;
  });
  return React.useCallback((...args) => callbackRef.current(...args), []);
}
