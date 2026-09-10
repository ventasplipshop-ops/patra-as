(function initAppController(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  function selectMode(mode) {
    document.querySelectorAll("[data-mode-tab]").forEach((button) => {
      const selected = button.dataset.modeTab === mode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    document.querySelectorAll("[data-mode-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.modePanel !== mode;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    FotoLab.generalEditor = new FotoLab.GeneralEditor(document.querySelector('[data-mode-panel="general"]'));
    FotoLab.fourByFourEditor = new FotoLab.FourByFourEditor(document.querySelector('[data-mode-panel="four"]'));
    document.querySelectorAll("[data-mode-tab]").forEach((button) => button.addEventListener("click", () => selectMode(button.dataset.modeTab)));
    selectMode("general");
  });

  global.addEventListener("error", (event) => {
    console.error("FotoLab", event.error || event.message);
  });
})(window);
