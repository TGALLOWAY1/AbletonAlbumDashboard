// Single-user V1: every row is owned by this id. Replace with auth.uid()
// when multi-user is added.
export const OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID ?? "00000000-0000-0000-0000-000000000001";
