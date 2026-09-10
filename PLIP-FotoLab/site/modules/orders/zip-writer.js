(function initZipWriter(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};
  const encoder = new TextEncoder();
  const crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    crcTable[index] = value >>> 0;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
  }

  function header(size) {
    const bytes = new Uint8Array(size);
    return { bytes, view: new DataView(bytes.buffer) };
  }

  async function toBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
    if (typeof value === "string") return encoder.encode(value);
    throw new Error("Entrada ZIP no compatible");
  }

  async function createZipBlob(entries, onProgress, now = new Date()) {
    if (!Array.isArray(entries) || !entries.length) throw new Error("El ZIP no contiene archivos");
    if (entries.length > 65535) throw new Error("Demasiados archivos para ZIP");
    const localChunks = [];
    const centralChunks = [];
    const records = [];
    const stamp = dosDateTime(now);
    let offset = 0;

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const name = encoder.encode(String(entry.name).replace(/^\/+/, ""));
      const data = await toBytes(entry.data);
      const checksum = crc32(data);
      const local = header(30);
      local.view.setUint32(0, 0x04034b50, true);
      local.view.setUint16(4, 20, true);
      local.view.setUint16(6, 0x0800, true);
      local.view.setUint16(8, 0, true);
      local.view.setUint16(10, stamp.time, true);
      local.view.setUint16(12, stamp.date, true);
      local.view.setUint32(14, checksum, true);
      local.view.setUint32(18, data.length, true);
      local.view.setUint32(22, data.length, true);
      local.view.setUint16(26, name.length, true);
      local.view.setUint16(28, 0, true);
      localChunks.push(local.bytes, name, data);
      records.push({ name, checksum, size: data.length, offset });
      offset += local.bytes.length + name.length + data.length;
      if (offset > 0xffffffff) throw new Error("El pedido supera el límite de 4 GB del ZIP portátil");
      onProgress?.(index + 1, entries.length);
    }

    const centralOffset = offset;
    for (const record of records) {
      const central = header(46);
      central.view.setUint32(0, 0x02014b50, true);
      central.view.setUint16(4, 20, true);
      central.view.setUint16(6, 20, true);
      central.view.setUint16(8, 0x0800, true);
      central.view.setUint16(10, 0, true);
      central.view.setUint16(12, stamp.time, true);
      central.view.setUint16(14, stamp.date, true);
      central.view.setUint32(16, record.checksum, true);
      central.view.setUint32(20, record.size, true);
      central.view.setUint32(24, record.size, true);
      central.view.setUint16(28, record.name.length, true);
      central.view.setUint16(30, 0, true);
      central.view.setUint16(32, 0, true);
      central.view.setUint16(34, 0, true);
      central.view.setUint16(36, 0, true);
      central.view.setUint32(38, 0, true);
      central.view.setUint32(42, record.offset, true);
      centralChunks.push(central.bytes, record.name);
      offset += central.bytes.length + record.name.length;
    }

    const end = header(22);
    end.view.setUint32(0, 0x06054b50, true);
    end.view.setUint16(4, 0, true);
    end.view.setUint16(6, 0, true);
    end.view.setUint16(8, records.length, true);
    end.view.setUint16(10, records.length, true);
    end.view.setUint32(12, offset - centralOffset, true);
    end.view.setUint32(16, centralOffset, true);
    end.view.setUint16(20, 0, true);
    return new Blob([...localChunks, ...centralChunks, end.bytes], { type: "application/zip" });
  }

  FotoLab.zipWriter = { crc32, createZipBlob };
})(window);
