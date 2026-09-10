(function initPdfGeneratorModule(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};
  const MM_TO_PT = 72 / 25.4;

  function mmToPt(value) {
    return value * MM_TO_PT;
  }

  function drawPreviewCutMarks(context, placement, scale) {
    const offset = 1 * scale;
    const length = 2.5 * scale;
    const x = placement.x * scale;
    const y = placement.yTop * scale;
    const size = placement.width * scale;
    context.beginPath();
    context.moveTo(x - offset - length, y); context.lineTo(x - offset, y);
    context.moveTo(x, y - offset - length); context.lineTo(x, y - offset);
    context.moveTo(x + size + offset, y); context.lineTo(x + size + offset + length, y);
    context.moveTo(x + size, y - offset - length); context.lineTo(x + size, y - offset);
    context.moveTo(x - offset - length, y + size); context.lineTo(x - offset, y + size);
    context.moveTo(x, y + size + offset); context.lineTo(x, y + size + offset + length);
    context.moveTo(x + size + offset, y + size); context.lineTo(x + size + offset + length, y + size);
    context.moveTo(x + size, y + size + offset); context.lineTo(x + size, y + size + offset + length);
    context.stroke();
  }

  function renderSheetPreview(canvas, photoCanvas, copies, cutMarks) {
    const layout = FotoLab.sheetLayout.calculateSheetLayout(copies);
    const cssWidth = Math.max(240, Math.min(460, canvas.parentElement?.clientWidth || 360));
    const cssHeight = cssWidth * (layout.sheet.height / layout.sheet.width);
    const ratio = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    canvas.style.aspectRatio = `${layout.sheet.width} / ${layout.sheet.height}`;
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "white";
    context.fillRect(0, 0, cssWidth, cssHeight);
    const scale = cssWidth / layout.sheet.width;
    context.strokeStyle = "#65676b";
    context.lineWidth = Math.max(0.5, 0.25 * scale);
    for (const placement of layout.pages[0]) {
      context.drawImage(photoCanvas, placement.x * scale, placement.yTop * scale, placement.width * scale, placement.height * scale);
      if (cutMarks) drawPreviewCutMarks(context, placement, scale);
    }
    return layout;
  }

  function drawPdfCutMarks(page, placement, pageHeight, color) {
    const x = mmToPt(placement.x);
    const y = pageHeight - mmToPt(placement.yTop + placement.height);
    const size = mmToPt(placement.width);
    const offset = mmToPt(1);
    const length = mmToPt(2.5);
    const options = { thickness: 0.35, color };
    const line = (start, end) => page.drawLine({ start, end, ...options });
    line({ x: x - offset - length, y: y + size }, { x: x - offset, y: y + size });
    line({ x, y: y + size + offset }, { x, y: y + size + offset + length });
    line({ x: x + size + offset, y: y + size }, { x: x + size + offset + length, y: y + size });
    line({ x: x + size, y: y + size + offset }, { x: x + size, y: y + size + offset + length });
    line({ x: x - offset - length, y }, { x: x - offset, y });
    line({ x, y: y - offset - length }, { x, y: y - offset });
    line({ x: x + size + offset, y }, { x: x + size + offset + length, y });
    line({ x: x + size, y: y - offset - length }, { x: x + size, y: y - offset });
  }

  async function createPdfBlob(photoCanvas, copies, cutMarks) {
    if (!global.PDFLib) throw new Error("El generador PDF no está disponible");
    const { PDFDocument, rgb } = global.PDFLib;
    const layout = FotoLab.sheetLayout.calculateSheetLayout(copies);
    const document = await PDFDocument.create();
    document.setTitle("PLIP FotoLab · Fotos 4×4");
    document.setSubject("Copias de 40 × 40 mm en hoja A4");
    document.setProducer("PLIP FotoLab · procesamiento local");
    const imageBytes = await (await FotoLab.canvas.canvasToBlob(photoCanvas, "image/png")).arrayBuffer();
    const embedded = await document.embedPng(imageBytes);
    const pageWidth = mmToPt(layout.sheet.width);
    const pageHeight = mmToPt(layout.sheet.height);
    const markColor = rgb(0.33, 0.34, 0.36);

    for (const placements of layout.pages) {
      const page = document.addPage([pageWidth, pageHeight]);
      for (const placement of placements) {
        page.drawImage(embedded, {
          x: mmToPt(placement.x),
          y: pageHeight - mmToPt(placement.yTop + placement.height),
          width: mmToPt(40),
          height: mmToPt(40),
        });
        if (cutMarks) drawPdfCutMarks(page, placement, pageHeight, markColor);
      }
    }

    const bytes = await document.save();
    return new Blob([bytes], { type: "application/pdf" });
  }

  FotoLab.pdf = { MM_TO_PT, mmToPt, renderSheetPreview, createPdfBlob };
})(window);
