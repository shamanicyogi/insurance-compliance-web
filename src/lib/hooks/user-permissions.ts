import { useState, useEffect, useCallback } from "react";

export type PermissionState = "granted" | "denied" | "prompt";

export function usePermission(name: "camera" | "microphone") {
  const [state, setState] = useState<PermissionState>("prompt");

  const checkPermission = useCallback(async () => {
    try {
      const permissionStatus = await navigator.permissions.query({
        name: name as PermissionName, // TODO: fix this PERMS
      });
      setState(permissionStatus.state);
      permissionStatus.onchange = () => {
        setState(permissionStatus.state);
      };
    } catch (error) {
      console.error(`Error querying permission for ${name}:`, error);
      setState("prompt"); // Fallback
    }
  }, [name]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestPermission = useCallback(async () => {
    try {
      const constraints = name === "camera" ? { video: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Immediately stop the tracks to avoid leaving the camera/mic on
      stream.getTracks().forEach((track) => track.stop());
      checkPermission(); // Re-check and update state
      return "granted";
    } catch (error) {
      console.error(`Error requesting ${name} permission:`, error);
      checkPermission(); // Re-check, it's likely 'denied' now
      return "denied";
    }
  }, [name, checkPermission]);

  return { state, requestPermission };
}
