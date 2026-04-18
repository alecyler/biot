const RESET_NAV_FLAG = "biots-reset-navigation";

export function navigateToWorldReset(): void {
  try {
    window.sessionStorage.setItem(RESET_NAV_FLAG, String(Date.now()));
  } catch {
    // Ignore storage failures.
  }

  const target = new URL(window.location.href);
  target.searchParams.set("reset", String(Date.now()));
  window.location.assign(target.toString());
}

export function consumePendingResetNavigation(): boolean {
  let hadPendingReset = false;
  try {
    hadPendingReset = window.sessionStorage.getItem(RESET_NAV_FLAG) !== null;
    window.sessionStorage.removeItem(RESET_NAV_FLAG);
  } catch {
    hadPendingReset = false;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.has("reset")) {
    url.searchParams.delete("reset");
    window.history.replaceState({}, "", url.toString());
    hadPendingReset = true;
  }

  return hadPendingReset;
}

export function rewardHookIsAvailable(): boolean {
  return false;
}
