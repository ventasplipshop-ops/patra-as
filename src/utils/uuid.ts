type BrowserCrypto = Partial<Pick<Crypto, "getRandomValues" | "randomUUID">>;

let fallbackSequence = 0;

/** UUID v4 para navegador, incluso en orígenes HTTP de la red local. */
export function uuidV4(cryptoSource: BrowserCrypto | undefined = globalThis.crypto): string {
  if (typeof cryptoSource?.randomUUID === "function") return cryptoSource.randomUUID.call(cryptoSource);

  const bytes = new Uint8Array(16);
  if (typeof cryptoSource?.getRandomValues === "function") {
    cryptoSource.getRandomValues(bytes);
  } else {
    // Último recurso para navegadores antiguos: suficiente para IDs locales no secretos.
    fallbackSequence = (fallbackSequence + 1) >>> 0;
    let seed = (Date.now() ^ fallbackSequence ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    for (let index = 0; index < bytes.length; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      bytes[index] = seed >>> 24;
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
