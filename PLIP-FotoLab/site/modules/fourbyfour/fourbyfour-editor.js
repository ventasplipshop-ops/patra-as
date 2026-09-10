(function initFourByFourModule(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  class FourByFourEditor {
    constructor(root) {
      this.root = root;
      this.$ = (selector) => root.querySelector(selector);
      this.canvas = this.$("#four-canvas");
      this.frame = this.$("#four-frame");
      this.sheetCanvas = this.$("#sheet-preview");
      this.store = FotoLab.createStore({
        sourceCanvas: null,
        fileName: "foto-4x4",
        zoom: 1,
        rotation: 0,
        panX: 0,
        panY: 0,
        copies: 4,
        cutMarks: true,
        processing: false,
      });
      this.bind();
      this.resizeObserver = new ResizeObserver(() => this.updateAll());
      this.resizeObserver.observe(this.frame);
      this.resizeObserver.observe(this.sheetCanvas.parentElement);
      this.updateAll();
    }

    state() {
      return this.store.get();
    }

    set(patch) {
      this.store.set(patch);
      this.updateAll();
    }

    transformState() {
      const state = this.state();
      return { zoom: state.zoom, rotation: state.rotation, panX: state.panX, panY: state.panY, flipX: false, flipY: false };
    }

    viewSize() {
      const bounds = this.canvas.getBoundingClientRect();
      const size = Math.max(1, Math.min(bounds.width, bounds.height || bounds.width));
      return { width: size, height: size };
    }

    drawFrame() {
      const state = this.state();
      const { width, height } = this.viewSize();
      const { context } = FotoLab.canvas.resizeDisplayCanvas(this.canvas, width, height);
      context.clearRect(0, 0, width, height);
      if (state.sourceCanvas) FotoLab.transform.drawCover(context, state.sourceCanvas, width, height, this.transformState());
    }

    renderFinal(size = 1200) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      const state = this.state();
      if (state.sourceCanvas) FotoLab.transform.drawCover(context, state.sourceCanvas, size, size, this.transformState());
      return canvas;
    }

    updateAll() {
      let state = this.state();
      let panMetrics = null;
      if (state.sourceCanvas) {
        const view = this.viewSize();
        panMetrics = FotoLab.transform.measureTransform(state.sourceCanvas, view.width, view.height, this.transformState());
        const correction = {};
        if (panMetrics.limitX < 0.01 && state.panX !== 0) correction.panX = 0;
        if (panMetrics.limitY < 0.01 && state.panY !== 0) correction.panY = 0;
        if (Object.keys(correction).length) {
          this.store.set(correction);
          state = this.state();
          panMetrics = FotoLab.transform.measureTransform(state.sourceCanvas, view.width, view.height, this.transformState());
        }
      }
      const enabled = Boolean(state.sourceCanvas) && !state.processing;
      this.$("#four-empty").hidden = Boolean(state.sourceCanvas);
      this.canvas.classList.toggle("draggable", enabled);
      ["#four-zoom", "#four-rotation", "#four-reset-transform"].forEach((selector) => { this.$(selector).disabled = !enabled; });
      this.$("#four-pan-x").disabled = !enabled || !panMetrics || panMetrics.limitX < 0.01;
      this.$("#four-pan-y").disabled = !enabled || !panMetrics || panMetrics.limitY < 0.01;
      this.$("#generate-pdf").disabled = !enabled;
      this.$("#four-zoom").value = state.zoom;
      this.$("#four-zoom-label").textContent = `${Math.round(state.zoom * 100)}%`;
      this.$("#four-pan-x").value = Math.round(state.panX * 100);
      this.$("#four-pan-y").value = Math.round(state.panY * 100);
      this.$("#four-pan-x-label").textContent = `${Math.round(state.panX * 100)}%`;
      this.$("#four-pan-y-label").textContent = `${Math.round(state.panY * 100)}%`;
      this.$("#four-rotation").value = state.rotation;
      this.$("#four-rotation-label").textContent = `${state.rotation > 0 ? "+" : ""}${Number(state.rotation).toFixed(0)}°`;
      this.$("#custom-copies").value = state.copies;
      this.root.querySelectorAll("[data-copies]").forEach((button) => button.classList.toggle("selected", Number(button.dataset.copies) === state.copies));
      this.$("#sheet-count").textContent = `${state.copies} ${state.copies === 1 ? "copia" : "copias"}`;
      const pageCount = FotoLab.sheetLayout.calculateSheetLayout(state.copies).pageCount;
      this.$("#sheet-pages").textContent = `${pageCount} ${pageCount === 1 ? "hoja" : "hojas"} A4`;
      requestAnimationFrame(() => {
        this.drawFrame();
        const photo = this.renderFinal(600);
        FotoLab.pdf.renderSheetPreview(this.sheetCanvas, photo, state.copies, state.cutMarks);
      });
    }

    notice(message) {
      this.$("#four-notice").textContent = message;
    }

    loadFile(file) {
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        this.notice("Formato no compatible. Usa JPG, PNG o WebP.");
        return;
      }
      if (file.size > 45 * 1024 * 1024) {
        this.notice("La imagen supera el límite de 45 MB.");
        return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const sourceCanvas = FotoLab.canvas.sourceCanvasFromImage(image, 2400);
        this.store.set({
          sourceCanvas,
          fileName: file.name.replace(/\.[^.]+$/, "") || "foto-4x4",
          zoom: 1,
          rotation: 0,
          panX: 0,
          panY: 0,
          processing: false,
        });
        this.$("#four-file-action").textContent = "Cambiar fotografía";
        this.$("#four-file-detail").textContent = file.name;
        this.notice(`${image.naturalWidth.toLocaleString("es-AR")} × ${image.naturalHeight.toLocaleString("es-AR")} px · fotografía original cargada localmente`);
        URL.revokeObjectURL(url);
        this.updateAll();
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        this.notice("No pude abrir esa imagen.");
      };
      image.src = url;
    }

    async generatePdf() {
      const state = this.state();
      if (!state.sourceCanvas) {
        this.$("#four-file").click();
        return;
      }
      this.store.set({ processing: true });
      this.notice("Generando PDF A4 a tamaño real…");
      this.updateAll();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      try {
        const photo = this.renderFinal(1200);
        const blob = await FotoLab.pdf.createPdfBlob(photo, state.copies, state.cutMarks);
        FotoLab.canvas.downloadBlob(blob, `${state.fileName}-4x4-${state.copies}-copias-A4.pdf`);
        this.notice(`PDF descargado · ${state.copies} copias de 40 × 40 mm · A4 210 × 297 mm`);
      } catch (error) {
        console.error(error);
        this.notice("No pude generar el PDF. Intenta nuevamente.");
      } finally {
        this.store.set({ processing: false });
        this.updateAll();
      }
    }

    bind() {
      const fileInput = this.$("#four-file");
      ["#four-dropzone", "#four-empty"].forEach((selector) => this.$(selector).addEventListener("click", () => fileInput.click()));
      fileInput.addEventListener("change", (event) => {
        this.loadFile(event.target.files[0]);
        event.target.value = "";
      });
      const dropzone = this.$("#four-dropzone");
      dropzone.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("over"); });
      dropzone.addEventListener("dragleave", () => dropzone.classList.remove("over"));
      dropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        dropzone.classList.remove("over");
        this.loadFile(event.dataTransfer.files[0]);
      });
      this.$("#four-zoom").addEventListener("input", (event) => this.set({ zoom: Number(event.target.value) }));
      this.$("#four-pan-x").addEventListener("input", (event) => this.set({ panX: Number(event.target.value) / 100 }));
      this.$("#four-pan-y").addEventListener("input", (event) => this.set({ panY: Number(event.target.value) / 100 }));
      this.$("#four-rotation").addEventListener("input", (event) => this.set({ rotation: Number(event.target.value), panX: 0, panY: 0 }));
      this.$("#four-reset-transform").addEventListener("click", () => this.set({ zoom: 1, rotation: 0, panX: 0, panY: 0 }));
      this.root.querySelectorAll("[data-copies]").forEach((button) => button.addEventListener("click", () => this.set({ copies: Number(button.dataset.copies) })));
      this.$("#custom-copies").addEventListener("change", (event) => this.set({ copies: Math.max(1, Math.min(99, Math.floor(Number(event.target.value) || 1))) }));
      this.$("#cut-marks").addEventListener("change", (event) => this.set({ cutMarks: event.target.checked }));
      this.$("#generate-pdf").addEventListener("click", () => this.generatePdf());

      FotoLab.transform.attachPointerDrag(this.canvas, {
        enabled: () => Boolean(this.state().sourceCanvas) && !this.state().processing,
        getStart: () => {
          const state = this.state();
          const view = this.viewSize();
          const metrics = FotoLab.transform.measureTransform(state.sourceCanvas, view.width, view.height, this.transformState());
          return { pixelX: metrics.panX, pixelY: metrics.panY };
        },
        onMove: ({ dx, dy, start }) => {
          const state = this.state();
          const view = this.viewSize();
          const next = FotoLab.transform.panFromPixels(state.sourceCanvas, view.width, view.height, this.transformState(), start.pixelX + dx, start.pixelY + dy);
          this.set(next);
        },
      });
    }
  }

  FotoLab.FourByFourEditor = FourByFourEditor;
})(window);
