import { XR, VRButton } from "@react-three/xr";
import type { ReactNode } from "react";

/** Optional WebXR. Desktop works fully without it; the button only does something if WebXR is available. */
export function ShowroomVRButton() {
  return <VRButton />;
}

export function XRLayer({ children }: { children: ReactNode }) {
  return <XR>{children}</XR>;
}
