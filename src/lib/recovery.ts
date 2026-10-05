// Short-lived httpOnly flag set when a password-reset email link is opened (see /auth/confirm).
// resetPassword() requires it, so /reset-password cannot be used as a no-questions password change.
export const RECOVERY_COOKIE = "sb-recovery";
export const RECOVERY_MAX_AGE = 15 * 60;
