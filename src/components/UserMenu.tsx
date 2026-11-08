import { type KeyboardEvent, useId, useRef, useState } from "react";

import type { Me } from "../api/me";
import { buttonClass } from "./StatusMessage";

export function UserMenu({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        {me.name}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-slate-200 bg-white p-4 text-sm shadow-lg"
      >
        <p>Roles: {me.roles.join(", ")}</p>
        <p className="mt-1">Teams: {me.teams.length > 0 ? me.teams.join(", ") : "none"}</p>
        <button type="button" className={`${buttonClass} mt-4 w-full`} onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
