(function initGeneralEditorModule(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};
  const MAX_FILES = 300;
  const MAX_FILE_SIZE = 45 * 1024 * 1024;
  const THUMBNAIL_MAX_SIDE = 360;
  const TRANSFORM_KEYS = new Set(["zoom", "rotation", "flipX", "flipY", "panX", "panY"]);
  const PRODUCTION_KEYS = new Set(["sizeId", "widthCm", "heightCm", "dpi", "product", "finish", "copies"]);

  class GeneralEditor {
    constructor(root) {
      this.root = root;
      this.$ = (selector) => root.querySelector(selector);
      this.canvas = this.$("#general-canvas");
      this.frame = this.$("#general-frame");
      this.items = [];
      this.selectedIds = new Set();
      this.activeId = null;
      this.anchorIndex = -1;
      this.nextId = 1;
      this.processing = false;
      this.dragDepth = 0;
      this.imageLoadToken = 0;
      this.bind();
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(this.frame);
      this.updateAll();
    }

    activeItem() {
      return this.items.find((item) => item.id === this.activeId) || null;
    }

    state() {
      const item = this.activeItem();
      if (!item) return {
        image: null, fileName: "foto-lista", widthCm: 10.2, heightCm: 15.2, dpi: 200,
        zoom: 1, rotation: 0, flipX: false, flipY: false, panX: 0, panY: 0,
        format: "jpeg", quality: 0.94, product: "foto", finish: "mate", copies: 1,
      };
      return {
        ...item,
        product: item.product || "foto",
        finish: item.finish || "mate",
        fileName: item.name.replace(/\.[^.]+$/, "") || "foto-lista",
        ...item.transform,
      };
    }

    updateActive(patch, refreshList = true) {
      if (!this.activeId) return;
      const assignsProduction = Object.keys(patch).some((key) => PRODUCTION_KEYS.has(key));
      this.items = this.items.map((item) => {
        if (item.id !== this.activeId) return item;
        const next = { ...item, transform: { ...item.transform } };
        for (const [key, value] of Object.entries(patch)) {
          if (TRANSFORM_KEYS.has(key)) next.transform[key] = value;
          else next[key] = value;
        }
        if (assignsProduction) next.productionAssigned = true;
        return next;
      });
      this.updateAll(refreshList);
    }

    transformState() {
      const state = this.state();
      return { zoom: state.zoom, rotation: state.rotation, flipX: state.flipX, flipY: state.flipY, panX: state.panX, panY: state.panY };
    }

    viewSize() {
      const bounds = this.canvas.getBoundingClientRect();
      return { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
    }

    draw() {
      const { width, height } = this.viewSize();
      const { context } = FotoLab.canvas.resizeDisplayCanvas(this.canvas, width, height);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#e8e9ec";
      context.fillRect(0, 0, width, height);
      const state = this.state();
      if (state.image) FotoLab.transform.drawCover(context, state.image, width, height, this.transformState());
    }

    updateAll(refreshList = true) {
      let state = this.state();
      let panMetrics = null;
      if (state.image) {
        const view = this.viewSize();
        panMetrics = FotoLab.transform.measureTransform(state.image, view.width, view.height, this.transformState());
        const correction = {};
        if (panMetrics.limitX < 0.01 && state.panX !== 0) correction.panX = 0;
        if (panMetrics.limitY < 0.01 && state.panY !== 0) correction.panY = 0;
        if (Object.keys(correction).length) {
          this.items = this.items.map((item) => item.id === this.activeId ? { ...item, transform: { ...item.transform, ...correction } } : item);
          state = this.state();
          panMetrics = FotoLab.transform.measureTransform(state.image, view.width, view.height, this.transformState());
        }
      }

      const outW = FotoLab.dpi.pixelsFromCm(state.widthCm, state.dpi);
      const outH = FotoLab.dpi.pixelsFromCm(state.heightCm, state.dpi);
      const cm = `${this.cm(state.widthCm)} × ${this.cm(state.heightCm)} cm`;
      const px = `${outW.toLocaleString("es-AR")} × ${outH.toLocaleString("es-AR")}`;
      this.frame.style.aspectRatio = `${state.widthCm} / ${state.heightCm}`;
      this.$("#general-pixel-output").textContent = `${px} px`;
      this.$("#general-result-size").textContent = cm;
      this.$("#general-result-pixels").textContent = `${px} píxeles a ${state.dpi} DPI`;
      this.$("#general-zoom").value = state.zoom;
      this.$("#general-zoom-label").textContent = `${Math.round(state.zoom * 100)}%`;
      this.$("#general-pan-x").value = Math.round(state.panX * 100);
      this.$("#general-pan-y").value = Math.round(state.panY * 100);
      this.$("#general-pan-x-label").textContent = `${Math.round(state.panX * 100)}%`;
      this.$("#general-pan-y-label").textContent = `${Math.round(state.panY * 100)}%`;
      this.$("#general-jpg-quality-label").textContent = `${Math.round(state.quality * 100)}%`;
      this.$("#general-jpg-quality-group").hidden = state.format !== "jpeg";
      this.$("#general-format-jpg").classList.toggle("selected", state.format === "jpeg");
      this.$("#general-format-png").classList.toggle("selected", state.format === "png");
      this.root.querySelectorAll("[data-general-dpi]").forEach((button) => button.classList.toggle("selected", Number(button.dataset.generalDpi) === state.dpi));
      this.$("#general-preset").value = state.sizeId || "custom";
      this.$("#general-width-cm").value = state.widthCm;
      this.$("#general-height-cm").value = state.heightCm;
      this.$("#general-product").value = state.product;
      this.$("#general-finish").value = state.finish;
      this.$("#general-copies").value = state.copies;
      this.$("#general-active-name").textContent = this.activeItem()?.name || "Vista previa";

      const enabled = Boolean(state.image) && !this.processing;
      ["#general-reset", "#general-rotate", "#general-flip", "#general-zoom", "#general-swap", "#general-width-cm", "#general-height-cm", "#general-preset", "#general-product", "#general-finish", "#general-copies"].forEach((selector) => { this.$(selector).disabled = !enabled; });
      this.root.querySelectorAll("[data-general-dpi]").forEach((button) => { button.disabled = !enabled; });
      this.$("#general-pan-x").disabled = !enabled || !panMetrics || panMetrics.limitX < 0.01;
      this.$("#general-pan-y").disabled = !enabled || !panMetrics || panMetrics.limitY < 0.01;
      this.$("#general-apply-selection").disabled = !enabled || this.selectedIds.size === 0;
      this.$("#general-add-files").disabled = this.processing;
      this.canvas.classList.toggle("draggable", enabled);
      this.$("#general-empty").hidden = Boolean(this.activeId);
      this.$("#general-download").disabled = this.processing || Boolean(this.activeId && !state.image);
      this.$("#general-download").textContent = state.image ? "↓ Descargar foto preparada" : this.activeId ? "Preparando fotografía…" : "↑ Cargar una fotografía";
      this.updateQuality(outW, outH);
      if (refreshList) {
        this.renderGrid();
        this.renderOrderSummary();
      }
      requestAnimationFrame(() => this.draw());
    }

    updateQuality(outW, outH) {
      const state = this.state();
      const item = this.activeItem();
      const card = this.$("#general-quality-card");
      card.className = "quality-card neutral";
      if (!item) {
        this.$("#general-quality-label").textContent = "Sin foto";
        this.$("#general-quality-detail").textContent = "—";
        return;
      }
      const rotated = FotoLab.transform.rotatedBounds(item.width, item.height, state.rotation);
      const scale = Math.max(outW / rotated.width, outH / rotated.height) * state.zoom;
      if (scale <= 1) {
        card.classList.add("good");
        this.$("#general-quality-label").textContent = "Calidad suficiente";
        this.$("#general-quality-detail").textContent = "No requiere ampliación";
      } else {
        const increase = Math.round((scale - 1) * 100);
        card.classList.add(increase <= 25 ? "warn" : "bad");
        this.$("#general-quality-label").textContent = increase <= 25 ? "Ampliación leve" : "Revisa la nitidez";
        this.$("#general-quality-detail").textContent = `Se ampliará ${increase}%`;
      }
    }

    cm(value) {
      return Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 });
    }

    notice(message) {
      this.$("#general-notice").textContent = message;
    }

    libraryNotice(message) {
      this.$("#general-library-notice").textContent = message;
    }

    resetTransform() {
      this.updateActive({ zoom: 1, rotation: 0, flipX: false, flipY: false, panX: 0, panY: 0 }, false);
    }

    setLoadProgress(done, total) {
      this.$("#general-load-status").hidden = total === 0;
      this.$("#general-load-text").textContent = "Preparando miniaturas…";
      this.$("#general-load-count").textContent = `${done}/${total}`;
      this.$("#general-load-bar").style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
    }

    isSupportedFile(file) {
      const validType = /^image\/(jpeg|png|webp)$/i.test(file.type || "");
      const validExtension = /\.(jpe?g|png|webp)$/i.test(file.name || "");
      return (validType || (!file.type && validExtension)) && file.size <= MAX_FILE_SIZE;
    }

    async loadFiles(fileList) {
      if (this.processing) return;
      const incoming = [...(fileList || [])];
      const available = Math.max(0, MAX_FILES - this.items.length);
      const files = incoming.slice(0, available);
      if (!files.length) {
        if (incoming.length) this.libraryNotice(`La biblioteca admite hasta ${MAX_FILES} fotografías.`);
        return;
      }
      const accepted = files.filter((file) => this.isSupportedFile(file));
      let rejected = incoming.length - accepted.length;
      const newItems = [];
      this.processing = true;
      this.setLoadProgress(0, accepted.length);
      this.updateAll();
      for (let index = 0; index < accepted.length; index += 1) {
        try {
          newItems.push(await this.loadItem(accepted[index]));
        } catch (error) {
          rejected += 1;
          console.warn(error.message);
        }
        this.setLoadProgress(index + 1, accepted.length);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      if (newItems.length) {
        this.items.push(...newItems);
        this.selectedIds = new Set(newItems.map((item) => item.id));
        this.activeId = newItems[0].id;
        this.anchorIndex = this.items.findIndex((item) => item.id === this.activeId);
        this.$("#general-file-action").textContent = "Agregar más fotografías";
        this.$("#general-file-detail").textContent = `${this.items.length} ${this.items.length === 1 ? "foto cargada" : "fotos cargadas"}`;
      }
      this.processing = false;
      this.setLoadProgress(0, 0);
      if (!newItems.length) {
        this.libraryNotice("No pude abrir archivos compatibles. Usa JPG, PNG o WebP de hasta 45 MB.");
        this.updateAll();
        return;
      }
      await this.loadActiveImage();
      this.libraryNotice(`${newItems.length} ${newItems.length === 1 ? "fotografía cargada" : "fotografías cargadas"}${rejected ? ` · ${rejected} omitida(s)` : ""} · procesamiento local`);
      const active = this.activeItem();
      this.notice(`${active.width.toLocaleString("es-AR")} × ${active.height.toLocaleString("es-AR")} px · fotografía activa`);
      this.updateAll();
    }

    async createThumbnail(image) {
      const scale = Math.min(1, THUMBNAIL_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await FotoLab.canvas.canvasToBlob(canvas, "image/jpeg", 0.82);
      canvas.width = 1;
      canvas.height = 1;
      return URL.createObjectURL(blob);
    }

    async loadItem(file) {
      const objectUrl = URL.createObjectURL(file);
      try {
        const image = await FotoLab.orderProcessing.loadImage(objectUrl);
        const thumbnailUrl = await this.createThumbnail(image);
        const item = FotoLab.orderState.createItem(file, `foto-${this.nextId++}`, objectUrl);
        item.thumbnailUrl = thumbnailUrl;
        item.width = image.naturalWidth;
        item.height = image.naturalHeight;
        if (item.width > item.height) {
          item.widthCm = 15.2;
          item.heightCm = 10.2;
        }
        image.src = "";
        return item;
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw new Error(`No se pudo abrir ${file.name}`);
      }
    }

    releaseDecodedImages(exceptId = null) {
      for (const item of this.items) {
        if (item.id !== exceptId && item.image) {
          item.image.src = "";
          item.image = null;
        }
      }
    }

    async loadActiveImage() {
      const item = this.activeItem();
      const token = ++this.imageLoadToken;
      if (!item || item.image) {
        this.updateAll();
        return;
      }
      this.updateAll();
      try {
        const image = await FotoLab.orderProcessing.loadImage(item.objectUrl);
        if (token !== this.imageLoadToken || this.activeId !== item.id) {
          image.src = "";
          return;
        }
        this.releaseDecodedImages(item.id);
        item.image = image;
        this.updateAll();
      } catch (error) {
        console.error(error);
        this.libraryNotice(`No pude volver a abrir ${item.name}. Retírala y cárgala nuevamente.`);
      }
    }

    productionLabel(item) {
      const size = FotoLab.orderCatalog.resolveSize(item);
      const product = FotoLab.orderCatalog.getProduct(item.product);
      const finish = FotoLab.orderCatalog.getFinish(item.finish);
      if (!item.productionAssigned || !size || !product || !finish) return "Sin configurar";
      const parts = [size.folder.replace("x", "×")];
      if (product.id !== "foto") parts.push(product.label);
      parts.push(finish.label);
      if (item.copies > 1) parts.push(`x${item.copies}`);
      return parts.join(" · ");
    }

    renderGrid() {
      const grid = this.$("#general-grid");
      grid.replaceChildren();
      for (const item of this.items) {
        const warning = FotoLab.orderValidation.qualityWarning(item);
        const selected = this.selectedIds.has(item.id);
        const editing = this.activeId === item.id;
        const card = document.createElement("article");
        card.className = `order-card${selected ? " selected" : ""}${editing ? " active" : ""}`;
        card.dataset.generalId = item.id;
        card.tabIndex = 0;
        card.setAttribute("role", "option");
        card.setAttribute("aria-selected", String(selected));
        if (editing) card.setAttribute("aria-current", "true");

        const thumb = document.createElement("div");
        thumb.className = "order-thumb";
        const image = document.createElement("img");
        image.src = item.thumbnailUrl;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        thumb.append(image);
        const check = document.createElement("button");
        check.type = "button";
        check.className = "order-check";
        check.dataset.generalSelectId = item.id;
        check.setAttribute("aria-label", `${selected ? "Deseleccionar" : "Seleccionar"} ${item.name}`);
        check.setAttribute("aria-pressed", String(selected));
        check.textContent = selected ? "✓" : "";
        thumb.append(check);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "order-remove";
        remove.dataset.generalRemoveId = item.id;
        remove.setAttribute("aria-label", `Retirar ${item.name}`);
        remove.title = "Retirar fotografía";
        remove.textContent = "×";
        thumb.append(remove);
        if (editing) {
          const badge = document.createElement("span");
          badge.className = "editing-badge";
          badge.textContent = "EDITANDO";
          thumb.append(badge);
        }
        if (warning) {
          const flag = document.createElement("span");
          flag.className = "quality-flag";
          flag.textContent = `+${warning.increase}%`;
          thumb.append(flag);
        }
        const body = document.createElement("div");
        body.className = "order-card-body";
        const title = document.createElement("strong");
        title.textContent = item.name;
        title.title = item.name;
        const production = document.createElement("span");
        production.className = `production-status${item.productionAssigned ? " configured" : " incomplete"}`;
        production.textContent = this.productionLabel(item);
        body.append(title, production);
        card.append(thumb, body);
        grid.append(card);
      }
      const hasItems = this.items.length > 0;
      grid.hidden = !hasItems;
      this.$("#general-empty-grid").hidden = hasItems;
      this.$("#general-total").textContent = `${this.items.length} ${this.items.length === 1 ? "foto" : "fotos"}`;
      this.$("#general-selected-count").textContent = `${this.selectedIds.size} seleccionada${this.selectedIds.size === 1 ? "" : "s"} de ${this.items.length}`;
      this.$("#general-select-all").disabled = !hasItems || this.processing || this.selectedIds.size === this.items.length;
      this.$("#general-clear-selection").disabled = this.selectedIds.size === 0 || this.processing;
    }

    renderOrderSummary() {
      const summary = this.$("#general-order-summary");
      const warnings = this.$("#general-order-warnings");
      summary.replaceChildren();
      warnings.replaceChildren();
      const groups = FotoLab.orderNaming.groupItems(this.items.filter((item) => item.productionAssigned));
      if (!groups.length) {
        const empty = document.createElement("p");
        empty.className = "order-summary-empty";
        empty.textContent = this.items.length ? "Asigna la producción para formar las carpetas del pedido." : "Carga fotografías para crear las carpetas del pedido.";
        summary.append(empty);
      } else {
        for (const group of groups) {
          const row = document.createElement("div");
          const name = document.createElement("strong");
          name.textContent = group.folder;
          const count = document.createElement("span");
          count.textContent = `${group.photoCount} ${group.photoCount === 1 ? "foto" : "fotos"} · ${group.copies} ${group.copies === 1 ? "copia" : "copias"}`;
          row.append(name, count);
          summary.append(row);
        }
      }
      const validation = FotoLab.orderValidation.validate(this.items);
      if (validation.incomplete.length) this.addWarning(warnings, "Datos incompletos", `${validation.incomplete.length} fotografía(s) necesitan datos de producción.`, true);
      if (validation.quality.length) this.addWarning(warnings, "Revisar resolución", `${validation.quality.length} fotografía(s) requieren ampliación para su salida.`, false);
      this.$("#general-order-status").textContent = `${this.items.length} ${this.items.length === 1 ? "foto" : "fotos"} · ${groups.length} ${groups.length === 1 ? "carpeta" : "carpetas"}`;
      this.$("#general-generate-order").disabled = !validation.valid || this.processing;
    }

    addWarning(container, title, message, bad) {
      const block = document.createElement("div");
      block.className = `warning-block${bad ? " bad" : ""}`;
      const strong = document.createElement("strong");
      strong.textContent = title;
      const span = document.createElement("span");
      span.textContent = message;
      block.append(strong, span);
      container.append(block);
    }

    async activate(itemId, event = {}) {
      const index = this.items.findIndex((item) => item.id === itemId);
      if (index < 0) return;
      if (event.shiftKey && this.anchorIndex >= 0) {
        const range = FotoLab.orderState.rangeIds(this.items, this.anchorIndex, index);
        this.selectedIds = new Set([...this.selectedIds, ...range]);
      } else if (event.ctrlKey || event.metaKey) {
        if (this.selectedIds.has(itemId)) this.selectedIds.delete(itemId);
        else this.selectedIds.add(itemId);
        this.anchorIndex = index;
      } else {
        this.anchorIndex = index;
      }
      const changed = this.activeId !== itemId;
      this.activeId = itemId;
      const item = this.activeItem();
      this.notice(`${item.width.toLocaleString("es-AR")} × ${item.height.toLocaleString("es-AR")} px · fotografía activa`);
      this.updateAll();
      if (changed) await this.loadActiveImage();
    }

    toggleSelection(itemId) {
      const index = this.items.findIndex((item) => item.id === itemId);
      if (index < 0) return;
      if (this.selectedIds.has(itemId)) this.selectedIds.delete(itemId);
      else this.selectedIds.add(itemId);
      this.anchorIndex = index;
      this.updateAll();
    }

    disposeItem(item) {
      if (!item) return;
      if (item.image) item.image.src = "";
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    }

    async removeItem(itemId) {
      const index = this.items.findIndex((item) => item.id === itemId);
      if (index < 0 || this.processing) return;
      const [removed] = this.items.splice(index, 1);
      this.disposeItem(removed);
      this.selectedIds.delete(itemId);
      if (this.activeId === itemId) {
        this.imageLoadToken += 1;
        const replacement = this.items[Math.min(index, this.items.length - 1)] || null;
        this.activeId = replacement?.id || null;
        this.anchorIndex = replacement ? this.items.indexOf(replacement) : -1;
      } else if (this.anchorIndex >= this.items.length) {
        this.anchorIndex = this.items.length - 1;
      }
      this.$("#general-file-detail").textContent = this.items.length ? `${this.items.length} ${this.items.length === 1 ? "foto cargada" : "fotos cargadas"}` : "JPG, PNG o WebP · máx. 45 MB por archivo";
      this.$("#general-file-action").textContent = this.items.length ? "Agregar más fotografías" : "Seleccionar una o varias fotografías";
      this.libraryNotice(`${removed.name} fue retirada. Las demás fotografías conservaron sus ajustes.`);
      this.updateAll();
      if (this.activeId && !this.activeItem().image) await this.loadActiveImage();
    }

    applyPreset(sizeId) {
      const item = this.activeItem();
      const preset = FotoLab.orderCatalog.getSize(sizeId);
      if (!item || !preset) return;
      const oriented = FotoLab.orderCatalog.orientedSize(preset, item);
      this.updateActive({ sizeId, widthCm: oriented.widthCm, heightCm: oriented.heightCm });
    }

    applyBulkSettings() {
      const active = this.activeItem();
      if (!active || !this.selectedIds.size) return;
      const sizeId = this.$("#general-preset").value;
      const product = this.$("#general-product").value;
      const finish = this.$("#general-finish").value;
      const copies = FotoLab.orderState.normalizeCopies(this.$("#general-copies").value);
      const dpi = Number(this.root.querySelector("[data-general-dpi].selected")?.dataset.generalDpi || active.dpi);
      const customWidth = Math.max(1, Number(this.$("#general-width-cm").value) || active.widthCm);
      const customHeight = Math.max(1, Number(this.$("#general-height-cm").value) || active.heightCm);
      this.items = this.items.map((item) => {
        if (!this.selectedIds.has(item.id)) return item;
        const preset = FotoLab.orderCatalog.getSize(sizeId);
        const dimensions = preset ? FotoLab.orderCatalog.orientedSize(preset, item) : { widthCm: customWidth, heightCm: customHeight };
        return { ...item, sizeId, widthCm: dimensions.widthCm, heightCm: dimensions.heightCm, dpi, product, finish, copies, productionAssigned: true, transform: item.transform };
      });
      this.libraryNotice(`Datos de producción aplicados a ${this.selectedIds.size} fotografía(s). Los encuadres se conservaron.`);
      this.updateAll();
    }

    async download() {
      const state = this.state();
      if (!this.activeId) {
        this.$("#general-file").click();
        return;
      }
      if (!state.image) return;
      const width = FotoLab.dpi.pixelsFromCm(state.widthCm, state.dpi);
      const height = FotoLab.dpi.pixelsFromCm(state.heightCm, state.dpi);
      if (width * height > 80000000) {
        this.notice("La salida es demasiado grande. Reduce medida o DPI.");
        return;
      }
      this.notice("Preparando el archivo a tamaño exacto…");
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      const context = output.getContext("2d");
      if (state.format === "jpeg") {
        context.fillStyle = "white";
        context.fillRect(0, 0, width, height);
      }
      FotoLab.transform.drawCover(context, state.image, width, height, this.transformState());
      const type = state.format === "jpeg" ? "image/jpeg" : "image/png";
      const raw = await FotoLab.canvas.canvasToBlob(output, type, state.quality);
      const buffer = await raw.arrayBuffer();
      const bytes = state.format === "jpeg" ? FotoLab.dpi.addJpegDpi(buffer, state.dpi) : FotoLab.dpi.addPngDpi(buffer, state.dpi);
      const extension = state.format === "jpeg" ? "jpg" : "png";
      const filename = `${state.fileName}-${this.cm(state.widthCm)}x${this.cm(state.heightCm)}cm-${state.dpi}dpi.${extension}`.replace(/,/g, "-");
      FotoLab.canvas.downloadBlob(new Blob([bytes], { type }), filename);
      this.notice(`Descargado · ${width.toLocaleString("es-AR")} × ${height.toLocaleString("es-AR")} px · ${state.dpi} DPI`);
    }

    setOrderProgress(message, value) {
      this.$("#general-order-progress-text").textContent = message;
      this.$("#general-order-progress-bar").style.width = `${Math.max(0, Math.min(100, value))}%`;
    }

    async generateOrderZip() {
      const validation = FotoLab.orderValidation.validate(this.items);
      if (!validation.valid || this.processing) return;
      this.processing = true;
      this.$("#general-order-progress").hidden = false;
      this.setOrderProgress("Preparando fotografías…", 2);
      this.updateAll();
      try {
        const entries = [];
        const namesByFolder = new Map();
        for (let index = 0; index < this.items.length; index += 1) {
          const item = this.items[index];
          const folder = FotoLab.orderNaming.folderName(item);
          if (!namesByFolder.has(folder)) namesByFolder.set(folder, new Set());
          const filename = FotoLab.orderNaming.allocateFileName(index + 1, item.copies, namesByFolder.get(folder));
          this.setOrderProgress(`Procesando ${index + 1} de ${this.items.length}…`, 5 + ((index / this.items.length) * 75));
          await new Promise((resolve) => requestAnimationFrame(resolve));
          entries.push({ name: `${folder}/${filename}`, data: await FotoLab.orderProcessing.renderItem(item) });
        }
        this.setOrderProgress("Armando pedido ZIP…", 84);
        const zip = await FotoLab.zipWriter.createZipBlob(entries, (done, total) => this.setOrderProgress("Armando pedido ZIP…", 84 + ((done / total) * 15)));
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
        FotoLab.canvas.downloadBlob(zip, `pedido-${stamp}.zip`);
        this.setOrderProgress("Pedido listo", 100);
        this.libraryNotice(`Pedido generado · ${this.items.length} fotografía(s) · ${entries.length} archivo(s) JPG organizados localmente.`);
      } catch (error) {
        console.error(error);
        this.libraryNotice(`No pude generar el pedido: ${error.message}`);
      } finally {
        this.processing = false;
        this.updateAll();
        setTimeout(() => { this.$("#general-order-progress").hidden = true; }, 900);
      }
    }

    isFileDrag(event) {
      return [...(event.dataTransfer?.types || [])].includes("Files");
    }

    showDropOverlay(show) {
      this.$("#general-drop-overlay").hidden = !show;
      this.$("#general-library").classList.toggle("drag-active", show);
    }

    cleanup() {
      this.imageLoadToken += 1;
      for (const item of this.items) this.disposeItem(item);
    }

    bind() {
      const fileInput = this.$("#general-file");
      ["#general-add-files", "#general-empty-grid", "#general-empty"].forEach((selector) => this.$(selector).addEventListener("click", () => fileInput.click()));
      fileInput.addEventListener("change", (event) => {
        this.loadFiles(event.target.files);
        event.target.value = "";
      });

      const library = this.$("#general-library");
      library.addEventListener("dragenter", (event) => {
        if (!this.isFileDrag(event)) return;
        event.preventDefault();
        this.dragDepth += 1;
        this.showDropOverlay(true);
      });
      library.addEventListener("dragover", (event) => {
        if (!this.isFileDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        this.showDropOverlay(true);
      });
      library.addEventListener("dragleave", (event) => {
        if (!this.isFileDrag(event)) return;
        this.dragDepth = Math.max(0, this.dragDepth - 1);
        if (this.dragDepth === 0) this.showDropOverlay(false);
      });
      library.addEventListener("drop", (event) => {
        if (!this.isFileDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        this.dragDepth = 0;
        this.showDropOverlay(false);
        this.loadFiles(event.dataTransfer.files);
      });
      global.addEventListener("dragover", (event) => { if (this.isFileDrag(event)) event.preventDefault(); });
      global.addEventListener("drop", (event) => { if (this.isFileDrag(event)) event.preventDefault(); });

      this.$("#general-select-all").addEventListener("click", () => { this.selectedIds = new Set(this.items.map((item) => item.id)); this.updateAll(); });
      this.$("#general-clear-selection").addEventListener("click", () => { this.selectedIds.clear(); this.updateAll(); });
      this.$("#general-grid").addEventListener("click", (event) => {
        const remove = event.target.closest("[data-general-remove-id]");
        if (remove) {
          event.stopPropagation();
          this.removeItem(remove.dataset.generalRemoveId);
          return;
        }
        const select = event.target.closest("[data-general-select-id]");
        if (select) {
          event.stopPropagation();
          this.toggleSelection(select.dataset.generalSelectId);
          return;
        }
        const card = event.target.closest("[data-general-id]");
        if (card) this.activate(card.dataset.generalId, event);
      });
      this.$("#general-grid").addEventListener("keydown", (event) => {
        const card = event.target.closest("[data-general-id]");
        if (card && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          this.activate(card.dataset.generalId, event);
        }
      });
      this.$("#general-preset").addEventListener("change", (event) => {
        if (event.target.value === "custom") this.updateActive({ sizeId: "custom" });
        else this.applyPreset(event.target.value);
      });
      ["#general-width-cm", "#general-height-cm"].forEach((selector) => {
        this.$(selector).addEventListener("change", () => this.updateActive({
          sizeId: "custom",
          widthCm: Math.max(1, Number(this.$("#general-width-cm").value) || 1),
          heightCm: Math.max(1, Number(this.$("#general-height-cm").value) || 1),
        }));
      });
      this.$("#general-swap").addEventListener("click", () => {
        const state = this.state();
        this.updateActive({ widthCm: state.heightCm, heightCm: state.widthCm });
      });
      this.root.querySelectorAll("[data-general-dpi]").forEach((button) => button.addEventListener("click", () => this.updateActive({ dpi: Number(button.dataset.generalDpi) })));
      this.$("#general-product").addEventListener("change", (event) => this.updateActive({ product: event.target.value }));
      this.$("#general-finish").addEventListener("change", (event) => this.updateActive({ finish: event.target.value }));
      this.$("#general-copies").addEventListener("change", (event) => this.updateActive({ copies: FotoLab.orderState.normalizeCopies(event.target.value) }));
      this.$("#general-apply-selection").addEventListener("click", () => this.applyBulkSettings());
      this.$("#general-reset").addEventListener("click", () => this.resetTransform());
      this.$("#general-rotate").addEventListener("click", () => this.updateActive({ rotation: (this.state().rotation + 90) % 360, panX: 0, panY: 0 }, false));
      this.$("#general-flip").addEventListener("click", () => this.updateActive({ flipX: !this.state().flipX }, false));
      this.$("#general-zoom").addEventListener("input", (event) => this.updateActive({ zoom: Number(event.target.value) }, false));
      this.$("#general-pan-x").addEventListener("input", (event) => this.updateActive({ panX: Number(event.target.value) / 100 }, false));
      this.$("#general-pan-y").addEventListener("input", (event) => this.updateActive({ panY: Number(event.target.value) / 100 }, false));
      this.$("#general-format-jpg").addEventListener("click", () => this.updateActive({ format: "jpeg" }, false));
      this.$("#general-format-png").addEventListener("click", () => this.updateActive({ format: "png" }, false));
      this.$("#general-jpg-quality").addEventListener("input", (event) => this.updateActive({ quality: Number(event.target.value) }, false));
      this.$("#general-download").addEventListener("click", () => this.download());
      this.$("#general-generate-order").addEventListener("click", () => this.generateOrderZip());
      global.addEventListener("pagehide", () => this.cleanup(), { once: true });

      FotoLab.transform.attachPointerDrag(this.canvas, {
        enabled: () => Boolean(this.state().image) && !this.processing,
        getStart: () => {
          const state = this.state();
          const view = this.viewSize();
          const metrics = FotoLab.transform.measureTransform(state.image, view.width, view.height, this.transformState());
          return { pixelX: metrics.panX, pixelY: metrics.panY };
        },
        onMove: ({ dx, dy, start }) => {
          const state = this.state();
          const view = this.viewSize();
          const next = FotoLab.transform.panFromPixels(state.image, view.width, view.height, this.transformState(), start.pixelX + dx, start.pixelY + dy);
          this.updateActive(next, false);
        },
      });
    }
  }

  FotoLab.GeneralEditor = GeneralEditor;
})(window);
