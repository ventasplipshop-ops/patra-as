(function initOrderNaming(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  function folderName(item) {
    const size = FotoLab.orderCatalog.resolveSize(item);
    if (!size || !item?.product || !item?.finish) return null;
    const parts = [size.folder];
    if (item.product !== "foto") parts.push(item.product);
    parts.push(item.finish);
    return parts.join(" ").toLowerCase();
  }

  function allocateFileName(index, copies, used = new Set()) {
    const copySuffix = Number(copies) > 1 ? `_x${Number(copies)}` : "";
    const stem = `${String(index).padStart(3, "0")}${copySuffix}`;
    let candidate = `${stem}.jpg`;
    let collision = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${stem}-${collision}.jpg`;
      collision += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  }

  function groupItems(items) {
    const groups = new Map();
    for (const item of items) {
      const folder = folderName(item);
      if (!folder) continue;
      if (!groups.has(folder)) groups.set(folder, { folder, items: [], photoCount: 0, copies: 0 });
      const group = groups.get(folder);
      group.items.push(item);
      group.photoCount += 1;
      group.copies += FotoLab.orderState.normalizeCopies(item.copies);
    }
    return [...groups.values()].sort((first, second) => first.folder.localeCompare(second.folder, "es"));
  }

  FotoLab.orderNaming = { folderName, allocateFileName, groupItems };
})(window);
