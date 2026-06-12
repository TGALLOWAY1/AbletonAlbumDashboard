import { revalidatePath } from "next/cache";

// Track-level mutations must refresh every surface that renders track data:
// both track detail route shapes (desktop + mobile), the focus page, the
// dashboard, and the session views. See CLAUDE.md "Feature parity rule".
export function revalidateTrackSurfaces(trackId: string) {
  revalidatePath(`/m/${trackId}`);
  revalidatePath(`/tracks/${trackId}`);
  revalidatePath(`/focus/${trackId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/sessions");
}
