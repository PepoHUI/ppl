const SIZE = 4;

export class Game2048 {
  constructor() {

    this.tiles = [];
    this.nextId = 1;
    this.score = 0;
    this.won = false;
    this.keepPlaying = false;
    this.over = false;
    this.reset();
  }

  reset() {
    this.tiles = [];
    this.score = 0;
    this.won = false;
    this.keepPlaying = false;
    this.over = false;
    this.nextId = 1;
    this.addRandomTile();
    this.addRandomTile();
  }

  tileAt(row, col) {
    return this.tiles.find((t) => t.row === row && t.col === col) ?? null;
  }

  getEmptyCells() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!this.tileAt(r, c)) empty.push({ row: r, col: c });
      }
    }
    return empty;
  }

  addRandomTile() {
    const empty = this.getEmptyCells();
    if (!empty.length) return null;
    const spot = empty[Math.floor(Math.random() * empty.length)];
    const tile = {
      id: this.nextId++,
      value: Math.random() < 0.9 ? 2 : 4,
      row: spot.row,
      col: spot.col,
      isNew: true,
    };
    this.tiles.push(tile);
    return tile;
  }

  canMove() {
    if (this.getEmptyCells().length) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = this.tileAt(r, c);
        if (!t) continue;
        if (c < SIZE - 1 && this.tileAt(r, c + 1)?.value === t.value) return true;
        if (r < SIZE - 1 && this.tileAt(r + 1, c)?.value === t.value) return true;
      }
    }
    return false;
  }

  move(direction) {
    if (this.over) return { moved: false, scoreDelta: 0, events: [], won: this.won, over: true };

    const events = [];
    let scoreDelta = 0;
    let moved = false;

    for (const tile of this.tiles) {
      delete tile.isNew;
      delete tile.mergedFrom;
    }

    for (const slots of getLines(direction)) {
      const result = slideLine(slots, this.tiles);
      if (result.moved) moved = true;
      scoreDelta += result.scoreDelta;
      events.push(...result.events);
      this.tiles = result.tiles;
    }

    if (!moved) {
      return { moved: false, scoreDelta: 0, events: [], won: this.won, over: this.over };
    }

    this.score += scoreDelta;
    const spawn = this.addRandomTile();
    if (spawn) events.push({ type: "spawn", tile: { ...spawn } });

    if (!this.won && !this.keepPlaying && this.tiles.some((t) => t.value >= 2048)) {
      this.won = true;
    }
    if (!this.canMove()) this.over = true;

    return { moved: true, scoreDelta, events, won: this.won && !this.keepPlaying, over: this.over };
  }

  continueAfterWin() {
    this.keepPlaying = true;
  }
}

function getLines(direction) {

  const lines = [];

  if (direction === "left" || direction === "right") {
    for (let r = 0; r < SIZE; r++) {
      const slots = [];
      for (let c = 0; c < SIZE; c++) {
        const col = direction === "left" ? c : SIZE - 1 - c;
        slots.push({ row: r, col });
      }
      lines.push(slots);
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const slots = [];
      for (let r = 0; r < SIZE; r++) {
        const row = direction === "up" ? r : SIZE - 1 - r;
        slots.push({ row, col: c });
      }
      lines.push(slots);
    }
  }

  return lines;
}

function slideLine(slots, tiles) {

  const events = [];
  let scoreDelta = 0;
  let moved = false;

  const before = slots.map((slot) => ({
    slot,
    tile: tiles.find((t) => t.row === slot.row && t.col === slot.col) ?? null,
  }));

  const inLine = before.map((b) => b.tile).filter((t) => t !== null);

  const packed = [];
  let i = 0;
  while (i < inLine.length) {
    const a = inLine[i];
    const b = inLine[i + 1];
    if (b && a.value === b.value) {
      packed.push({
        id: a.id,
        value: a.value * 2,
        mergedFrom: [a.id, b.id],
      });
      scoreDelta += a.value * 2;
      i += 2;
    } else {
      packed.push({ id: a.id, value: a.value });
      i += 1;
    }
  }

  const removedIds = new Set(
    inLine.filter((t) => !packed.some((p) => p.id === t.id)).map((t) => t.id),
  );
  for (const p of packed) {
    if (p.mergedFrom) removedIds.add(p.mergedFrom[1]);
  }

  for (let idx = 0; idx < SIZE; idx++) {
    const { row, col } = slots[idx];
    const spec = packed[idx];
    const prev = before[idx].tile;

    if (!spec) continue;

    const tile = tiles.find((t) => t.id === spec.id);
    if (!tile) continue;

    if (spec.mergedFrom) {
      const partnerId = spec.mergedFrom[1];
      const partner = tiles.find((t) => t.id === partnerId);
      events.push({
        type: "merge",
        into: { id: tile.id, value: spec.value, row, col, mergedFrom: spec.mergedFrom },
        removedId: partnerId,
        fromRow: tile.row,
        fromCol: tile.col,
        partnerRow: partner?.row ?? row,
        partnerCol: partner?.col ?? col,
      });
      moved = true;
      tile.value = spec.value;
      tile.row = row;
      tile.col = col;
      tile.mergedFrom = spec.mergedFrom;
    } else if (tile.row !== row || tile.col !== col) {
      events.push({
        type: "move",
        id: tile.id,
        fromRow: tile.row,
        fromCol: tile.col,
        toRow: row,
        toCol: col,
      });
      moved = true;
      tile.row = row;
      tile.col = col;
      delete tile.mergedFrom;
    }
  }

  return {
    moved,
    scoreDelta,
    events,
    tiles: tiles.filter((t) => !removedIds.has(t.id)),
  };
}

export { SIZE };
