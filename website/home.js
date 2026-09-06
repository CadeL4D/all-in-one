document.querySelectorAll("[data-filter]").forEach(
  (button) =>
    (button.onclick = () => {
      document
        .querySelectorAll("[data-filter]")
        .forEach((b) => b.classList.toggle("active", b === button));
      document
        .querySelectorAll("[data-kind]")
        .forEach(
          (card) =>
            (card.hidden =
              button.dataset.filter !== "all" &&
              card.dataset.kind !== button.dataset.filter),
        );
    }),
);
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
async function install() {
  if (installPrompt) {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    return;
  }
  document.getElementById("hub-install-copy").textContent = matchMedia(
    "(display-mode: standalone)",
  ).matches
    ? "One Hub is already installed."
    : /iPhone|iPad|iPod/.test(navigator.userAgent)
      ? "In Safari, open Share → Add to Home Screen → Add."
      : "Open the browser menu and choose Install app or Add to Home screen.";
  document.getElementById("hub-install-guide").showModal();
}
document.getElementById("hub-install").onclick = install;
document.getElementById("hub-install-secondary").onclick = install;
document.getElementById("hub-close").onclick = () =>
  document.getElementById("hub-install-guide").close();
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      document.getElementById("hub-offline").textContent =
        "Your library · available offline";
    })
    .catch(() => {
      document.getElementById("hub-offline").textContent = "Online library";
    });
