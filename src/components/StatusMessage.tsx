import type { ReactNode } from "react";

/** A centred, full-page message, e.g. "Signing in…". */
export function StatusMessage({ children, role = "status" }: { children: ReactNode; role?: "status" | "alert" }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
      <div role={role} className="flex flex-col items-center gap-4 text-center">
        {children}
      </div>
    </div>
  );
}

export const buttonClass =
  "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

export function SignInUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <StatusMessage role="alert">
      <p>Sign-in is unavailable, try again</p>
      <button type="button" className={buttonClass} onClick={onRetry}>
        Try again
      </button>
    </StatusMessage>
  );
}
