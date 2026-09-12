/* ================================================================
   QuizPro — Proctoring Lockdown Engine
   ================================================================
   Three layers, each adding on top of the last:

   LAYER 1 — WEB DETECTION (always active)
     Catches: tab switches, fullscreen exit, split-screen (resize),
     window blur (floating windows / PiP), dev tools open, clipboard
     events, and multi-touch (second-device simulation).
     On violation: logs it AND freezes the quiz behind a blocking
     overlay. The student must tap "Return to quiz" to continue
     (re-entering fullscreen). Repeated violations auto-submit.

   LAYER 2 — BLOCKING OVERLAY
     A full-screen opaque wall that hides quiz content when the
     student leaves. They cannot see the questions while away.
     This is the key deterrent: even if flagging alone doesn't
     stop them, hiding the content forces them back.

   LAYER 3 — NATIVE KIOSK (Capacitor only)
     When running inside the Capacitor native shell, calls the
     platform kiosk API:
     • Android: Lock Task Mode (pins the app, disables recents/home)
     • iOS: Triggers Guided Access prompt (requires institutional
       MDM for automatic; otherwise students confirm once)
     Falls back gracefully to Layer 1+2 when running in a browser.
   ================================================================ */

// ── Platform detection ────────────────────────────────────────────
const isCapacitor = () =>
  typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();

const isAndroid = () =>
  isCapacitor() && window.Capacitor.getPlatform() === "android";

const isIOS = () =>
  isCapacitor() && window.Capacitor.getPlatform() === "ios";

const isMobile = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);


// ── LAYER 3: Native kiosk plugin bridge ───────────────────────────
// These call into the Capacitor plugin `capacitor-kiosk-mode`.
// If not available, they resolve silently (layer 1+2 still work).

async function startKioskMode() {
  if (!isCapacitor()) return false;
  try {
    const { KioskMode } = await import("capacitor-kiosk-mode");
    if (isAndroid()) {
      // Lock Task Mode: pins the app, hides nav bar + recents
      await KioskMode.startLockTask();
    } else if (isIOS()) {
      // Guided Access: prompts user (or auto-starts if MDM-managed)
      await KioskMode.startGuidedAccess();
    }
    return true;
  } catch (e) {
    console.warn("Kiosk plugin not available:", e.message);
    return false;
  }
}

async function stopKioskMode() {
  if (!isCapacitor()) return;
  try {
    const { KioskMode } = await import("capacitor-kiosk-mode");
    if (isAndroid()) {
      await KioskMode.stopLockTask();
    } else if (isIOS()) {
      await KioskMode.stopGuidedAccess();
    }
  } catch (_) {}
}


// ── LAYER 1+2: Web lockdown engine ────────────────────────────────

/**
 * Creates a proctoring session. Call on exam start, returns a
 * cleanup function to call on exam end / unmount.
 *
 * @param {Object} opts
 * @param {Function} opts.onFlag        - (label: string) => void — log a violation
 * @param {Function} opts.onLock        - () => void — show the blocking overlay
 * @param {Function} opts.onAutoSubmit  - () => void — force-submit after too many violations
 * @param {number}   opts.autoSubmitAt  - auto-submit after this many violations (default: 5)
 * @param {HTMLElement} opts.container  - the exam container element
 * @returns {Function} cleanup
 */
export function createLockdownSession({
  onFlag,
  onLock,
  onAutoSubmit,
  autoSubmitAt = 5,
  container,
}) {
  let violationCount = 0;
  let initialWidth = window.innerWidth;
  let initialHeight = window.innerHeight;
  let isLocked = false;
  let wakeLock = null;

  // ── Debounce: multiple events fire for a single user action ──
  // e.g. visibilitychange + blur fire together on app switch.
  // Coalesce events within a 500ms window into one violation.
  let debounceTimer = null;
  let pendingLabel = null;

  const flag = (label) => {
    if (debounceTimer) {
      // Already have a pending violation in this window — append the
      // label but don't increment again.
      pendingLabel = pendingLabel + " + " + label;
      return;
    }
    pendingLabel = label;
    debounceTimer = setTimeout(() => {
      violationCount++;
      onFlag(pendingLabel);
      debounceTimer = null;
      pendingLabel = null;

      // Auto-submit on excessive violations
      if (violationCount >= autoSubmitAt) {
        onFlag(`Auto-submitted: ${autoSubmitAt} violations reached`);
        onAutoSubmit?.();
        return;
      }

      // Lock (show overlay) on every violation
      if (!isLocked) {
        isLocked = true;
        onLock();
      }
    }, 500);
  };

  // ── Called by the UI when student taps "Return to quiz" ──────
  // Resets the engine's isLocked so the overlay can re-appear on
  // the next violation.
  const unlock = () => {
    isLocked = false;
  };

  // ── Visibility change (tab switch / app switch) ──────────────
  const onVisibility = () => {
    if (document.hidden) {
      flag("Left the test window");
    }
  };

  // ── Fullscreen exit ──────────────────────────────────────────
  const onFullscreenChange = () => {
    const el = document.fullscreenElement || document.webkitFullscreenElement;
    if (!el) {
      flag("Exited fullscreen");
    }
  };

  // ── Window blur (floating windows, PiP, notification shade) ──
  const onBlur = () => {
    // Small delay to avoid false positives from internal focus shifts
    setTimeout(() => {
      if (!document.hasFocus()) {
        flag("Window lost focus (possible floating window)");
      }
    }, 200);
  };

  // ── Resize detection (split-screen / floating window resize) ──
  // Checks if the viewport shrank significantly, which happens when
  // Android/iOS enters split-screen or a floating window appears.
  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const widthDelta = Math.abs(w - initialWidth) / initialWidth;
    const heightDelta = Math.abs(h - initialHeight) / initialHeight;

    // >15% size change = probable split-screen
    if (widthDelta > 0.15 || heightDelta > 0.15) {
      flag("Screen resized (possible split-screen or floating window)");
      initialWidth = w;
      initialHeight = h;
    }
  };

  // ── Right-click / context menu block ─────────────────────────
  const onContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  // ── Copy / paste / cut block ─────────────────────────────────
  const onClipboard = (e) => {
    e.preventDefault();
    flag(`Clipboard action blocked: ${e.type}`);
    return false;
  };

  // ── Dev tools detection (crude but effective) ────────────────
  // Detects the devtools resize pattern: the outer window stays the
  // same but the inner viewport shrinks (desktop only).
  let devtoolsOpen = false;
  const checkDevtools = () => {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    const isOpen = widthDiff > threshold || heightDiff > threshold;
    if (isOpen && !devtoolsOpen) {
      devtoolsOpen = true;
      flag("Developer tools detected");
    }
    devtoolsOpen = isOpen;
  };

  // ── Multi-touch detection ───────────────────────────────────
  // More than 2 simultaneous touches is suspicious (second device
  // touching the screen, or gesture to open app switcher).
  const onTouchStart = (e) => {
    if (e.touches.length > 2) {
      flag("Multi-touch gesture detected");
    }
  };

  // ── Screen Wake Lock (prevent dimming during exam) ──────────
  const acquireWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (_) {}
  };

  // ── Request fullscreen ──────────────────────────────────────
  const requestFullscreen = async () => {
    if (container) {
      try {
        const rfs = container.requestFullscreen || container.webkitRequestFullscreen;
        if (rfs) await rfs.call(container);
      } catch (_) {}
    }
  };

  // ── Setup ───────────────────────────────────────────────────
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", onResize);
  document.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("copy", onClipboard);
  document.addEventListener("paste", onClipboard);
  document.addEventListener("cut", onClipboard);
  document.addEventListener("touchstart", onTouchStart, { passive: true });

  const devtoolsInterval = setInterval(checkDevtools, 2000);
  acquireWakeLock();
  requestFullscreen();

  // Try to start native kiosk mode
  startKioskMode();

  // ── Cleanup ─────────────────────────────────────────────────
  const cleanup = () => {
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("contextmenu", onContextMenu);
    document.removeEventListener("copy", onClipboard);
    document.removeEventListener("paste", onClipboard);
    document.removeEventListener("cut", onClipboard);
    document.removeEventListener("touchstart", onTouchStart);
    clearInterval(devtoolsInterval);
    if (debounceTimer) clearTimeout(debounceTimer);

    if (wakeLock) { wakeLock.release().catch(() => {}); }

    // Exit fullscreen
    const exitFn = document.exitFullscreen || document.webkitExitFullscreen;
    if (exitFn && (document.fullscreenElement || document.webkitFullscreenElement)) {
      exitFn.call(document).catch(() => {});
    }

    // Release native kiosk mode
    stopKioskMode();
  };

  return { cleanup, unlock };
}

/**
 * Re-enters the exam from the lockdown overlay.
 * Re-requests fullscreen and focuses the window.
 */
export async function returnToExam(container) {
  try {
    const rfs = container?.requestFullscreen || container?.webkitRequestFullscreen;
    if (rfs) await rfs.call(container);
  } catch (_) {}
  window.focus();
}

/**
 * Check if native kiosk mode is available.
 * Use this to show the appropriate messaging on the Rules screen.
 */
export function getProctorCapabilities() {
  return {
    nativeKiosk: isCapacitor(),
    platform: isAndroid() ? "android" : isIOS() ? "ios" : "web",
    isMobile: isMobile(),
  };
}
