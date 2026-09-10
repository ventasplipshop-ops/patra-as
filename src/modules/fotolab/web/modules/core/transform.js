(function initTransformModule(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function imageDimensions(image) {
    return {
      width: image.naturalWidth || image.videoWidth || image.width,
      height: image.naturalHeight || image.videoHeight || image.height,
    };
  }

  function rotatedBounds(width, height, rotation) {
    const radians = (rotation * Math.PI) / 180;
    const cosine = Math.abs(Math.cos(radians));
    const sine = Math.abs(Math.sin(radians));
    return {
      width: width * cosine + height * sine,
      height: width * sine + height * cosine,
    };
  }

  function measureTransform(image, frameWidth, frameHeight, transform) {
    const source = imageDimensions(image);
    const bounds = rotatedBounds(source.width, source.height, transform.rotation || 0);
    const baseScale = Math.max(frameWidth / bounds.width, frameHeight / bounds.height);
    const scale = baseScale * (transform.zoom || 1);
    const limitX = Math.max(0, (bounds.width * scale - frameWidth) / 2);
    const limitY = Math.max(0, (bounds.height * scale - frameHeight) / 2);
    const panX = clamp(transform.panX || 0, -1, 1) * limitX;
    const panY = clamp(transform.panY || 0, -1, 1) * limitY;
    return { source, bounds, baseScale, scale, limitX, limitY, panX, panY };
  }

  function panFromPixels(image, frameWidth, frameHeight, transform, pixelX, pixelY) {
    const metrics = measureTransform(image, frameWidth, frameHeight, transform);
    return {
      panX: metrics.limitX ? clamp(pixelX / metrics.limitX, -1, 1) : 0,
      panY: metrics.limitY ? clamp(pixelY / metrics.limitY, -1, 1) : 0,
    };
  }

  function drawCover(context, image, frameWidth, frameHeight, transform) {
    const metrics = measureTransform(image, frameWidth, frameHeight, transform);
    context.save();
    context.translate(frameWidth / 2 + metrics.panX, frameHeight / 2 + metrics.panY);
    context.scale(transform.flipX ? -metrics.scale : metrics.scale, transform.flipY ? -metrics.scale : metrics.scale);
    context.rotate(((transform.rotation || 0) * Math.PI) / 180);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, -metrics.source.width / 2, -metrics.source.height / 2);
    context.restore();
    return metrics;
  }

  function attachPointerDrag(element, handlers) {
    let dragging = null;

    const stop = (event) => {
      if (!dragging || dragging.id !== event.pointerId) return;
      dragging = null;
      handlers.onEnd?.();
    };

    element.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (!handlers.enabled()) return;
      event.preventDefault();
      element.setPointerCapture(event.pointerId);
      dragging = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        start: handlers.getStart(),
      };
      handlers.onStart?.();
    });
    element.addEventListener("pointermove", (event) => {
      if (!dragging || dragging.id !== event.pointerId) return;
      event.preventDefault();
      handlers.onMove({
        dx: event.clientX - dragging.x,
        dy: event.clientY - dragging.y,
        start: dragging.start,
      });
    }, { passive: false });
    element.addEventListener("pointerup", stop);
    element.addEventListener("pointercancel", stop);
    element.addEventListener("lostpointercapture", () => {
      dragging = null;
      handlers.onEnd?.();
    });

    return () => { dragging = null; };
  }

  FotoLab.transform = {
    clamp,
    imageDimensions,
    rotatedBounds,
    measureTransform,
    panFromPixels,
    drawCover,
    attachPointerDrag,
  };
})(window);
