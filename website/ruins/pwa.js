// Offline shell: register the service worker and surface the update when a
// new release is waiting (same pattern the hub uses).
export function pwa() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").then(
    (reg) => {
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            next.postMessage({ type: "ACTIVATE_UPDATE" });
          }
        });
      });
    },
    () => {
      /* offline play just needs a first online visit */
    },
  );
}
