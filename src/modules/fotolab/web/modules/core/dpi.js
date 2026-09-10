(function initDpiModule(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  function writeUint32(target, offset, value) {
    target[offset] = (value >>> 24) & 255;
    target[offset + 1] = (value >>> 16) & 255;
    target[offset + 2] = (value >>> 8) & 255;
    target[offset + 3] = value & 255;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function addPngDpi(buffer, dpi) {
    const original = new Uint8Array(buffer);
    const chunk = new Uint8Array(21);
    writeUint32(chunk, 0, 9);
    chunk.set([112, 72, 89, 115], 4);
    const pixelsPerMeter = Math.round(dpi / 0.0254);
    writeUint32(chunk, 8, pixelsPerMeter);
    writeUint32(chunk, 12, pixelsPerMeter);
    chunk[16] = 1;
    writeUint32(chunk, 17, crc32(chunk.slice(4, 17)));
    const insertAt = 33;
    const output = new Uint8Array(original.length + chunk.length);
    output.set(original.slice(0, insertAt), 0);
    output.set(chunk, insertAt);
    output.set(original.slice(insertAt), insertAt + chunk.length);
    return output;
  }

  function addJpegDpi(buffer, dpi) {
    const source = new Uint8Array(buffer);
    const density = Math.min(65535, Math.max(1, Math.round(dpi)));
    for (let index = 2; index < Math.min(source.length - 17, 4096); index += 1) {
      if (source[index] === 0xff && source[index + 1] === 0xe0 && source[index + 4] === 0x4a && source[index + 5] === 0x46 && source[index + 6] === 0x49 && source[index + 7] === 0x46) {
        const output = source.slice();
        output[index + 11] = 1;
        output[index + 12] = density >> 8;
        output[index + 13] = density & 255;
        output[index + 14] = density >> 8;
        output[index + 15] = density & 255;
        return output;
      }
    }
    const jfif = new Uint8Array([255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, density >> 8, density & 255, density >> 8, density & 255, 0, 0]);
    const output = new Uint8Array(source.length + jfif.length);
    output.set(source.slice(0, 2), 0);
    output.set(jfif, 2);
    output.set(source.slice(2), 2 + jfif.length);
    return output;
  }

  FotoLab.dpi = {
    pixelsFromCm: (centimeters, dpi) => Math.round((centimeters / 2.54) * dpi),
    addPngDpi,
    addJpegDpi,
  };
})(window);
