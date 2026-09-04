let promptEvent = null,
  registration = null,
  reloading = false;
const status = document.getElementById("offline-status");
const update = document.getElementById("apply-update");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptEvent = e;
});
document.querySelectorAll("[data-install]").forEach((button) =>
  button.addEventListener("click", async () => {
    if (
      matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone
    ) {
      document.getElementById("install-copy").textContent =
        "You are already playing the installed app.";
    } else if (promptEvent) {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      promptEvent = null;
      return;
    } else {
      document.getElementById("install-copy").textContent =
        /iPad|iPhone|iPod/.test(navigator.userAgent)
          ? "In Safari, open Share, choose Add to Home Screen, then Add. Open the new Destiny icon to play in its own window."
          : "Open your browser menu and choose Install app or Add to Home screen. If installation is not offered, you can keep playing in this browser.";
    }
    document.getElementById("install-guide").showModal();
  }),
);
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(async (reg) => {
      registration = reg;
      // Wait for this game's worker, not an already-active parent Hub worker.
      if (!reg.active || reg.active.state !== "activated")
        await new Promise((resolve, reject) => {
          const worker = reg.installing || reg.waiting;
          if (!worker) {
            reject(new Error("No game worker"));
            return;
          }
          const check = () => {
            if (worker.state === "activated") resolve();
            else if (worker.state === "redundant")
              reject(new Error("Offline install failed"));
          };
          worker.addEventListener("statechange", check);
          check();
        });
      status.textContent = "Offline ready · progress stays on this device";
      if (reg.waiting) update.hidden = false;
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          )
            update.hidden = false;
        });
      });
      reg.update().catch(() => {});
    })
    .catch(() => {
      status.textContent =
        "Offline setup unavailable. Keep a connection and export your save.";
    });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) location.reload();
  });
} else
  status.textContent = "Offline installation is not supported in this browser.";
update.addEventListener("click", () => {
  if (registration?.waiting) {
    if (
      !window.dispatchEvent(
        new Event("game-save-request", { cancelable: true }),
      )
    ) {
      status.textContent = "Update paused: export your save before reloading.";
      return;
    }
    reloading = true;
    registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  }
});
window.addEventListener("offline", () => {
  status.textContent = "Playing offline · your village still saves";
});
window.addEventListener("online", () => {
  status.textContent = "Online · your village saves on this device";
  registration?.update().catch(() => {});
});
