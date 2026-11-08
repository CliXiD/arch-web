import { ApiError, isAuthUnavailable, useMe } from "../api/me";
import { useAuth } from "../auth/context";
import { buttonClass, SignInUnavailable, StatusMessage } from "./StatusMessage";
import { UserMenu } from "./UserMenu";

/** The app shell: header with the user menu from /api/v1/me, and the main content. */
export function Shell() {
  const { signOut } = useAuth();
  const me = useMe();
  const onSignOut = () => void signOut();

  if (me.error instanceof ApiError && me.error.status === 403) {
    return (
      <StatusMessage role="alert">
        <p>You don&apos;t have access to Architecture E2E; ask an admin</p>
        <button type="button" className={buttonClass} onClick={onSignOut}>
          Sign out
        </button>
      </StatusMessage>
    );
  }

  if (isAuthUnavailable(me.error)) {
    return <SignInUnavailable onRetry={() => void me.refetch()} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold">Architecture E2E</h1>
        {me.isPending ? (
          <p role="status" className="text-sm text-slate-600">
            Loading…
          </p>
        ) : me.isError ? (
          <div role="alert" className="flex items-center gap-3 text-sm">
            <p>Couldn&apos;t load your profile</p>
            <button type="button" className={buttonClass} onClick={() => void me.refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <UserMenu me={me.data} onSignOut={onSignOut} />
        )}
      </header>
      <main className="p-6">
        <p>The landscape is coming soon.</p>
      </main>
    </div>
  );
}
