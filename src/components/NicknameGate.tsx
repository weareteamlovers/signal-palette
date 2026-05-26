"use client";

import { NicknameModal } from "./NicknameModal";

/** Client wrapper around NicknameModal that the server `page.tsx` mounts
 *  whenever the logged-in user has no nickname yet. Handles the post-save
 *  bookkeeping (reload so server fetches pick up the new user_metadata).
 *
 *  4a-6 will extend onComplete to also auto-open the edit-portfolio modal
 *  via a query param or sessionStorage flag. */
export function NicknameGate() {
  return (
    <NicknameModal
      onComplete={() => {
        // 4a-5: full reload so the server re-runs auth.getUser() and the
        // page renders with the populated user_metadata.nickname.
        window.location.reload();
      }}
    />
  );
}
