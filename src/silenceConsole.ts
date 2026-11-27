/**
 * Must be the FIRST import in main.tsx.
 *
 * ES modules evaluate their imports before the importing module's body, so
 * silencing console inside main.tsx came too late: the default-vocabulary
 * pipeline logs ~68k lines while modules load. In the Android app (Capacitor
 * WebView) every console call is also forwarded to native Logcat, which kept
 * the first render from happening for a long time (blank white screen after
 * the splash on real phones). console.error stays on for real problems.
 */
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
  console.table = noop;
}

export {};
