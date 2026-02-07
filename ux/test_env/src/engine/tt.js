"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranspositionTable = exports.NodeType = void 0;
exports.NodeType = {
    EXACT: 0,
    LOWER_BOUND: 1,
    UPPER_BOUND: 2
};
class TranspositionTable {
    constructor(sizeMB) {
        // Roughly 64 bytes per entry in V8 (estimates vary, but let's be conservative)
        // 1MB = 1048576 bytes
        const entrySize = 100; // conservative estimate for object overhead
        this.size = Math.floor((sizeMB * 1024 * 1024) / entrySize);
        this.table = new Array(this.size).fill(null);
    }
    store(key, depth, score, type, move) {
        const index = Number(key % BigInt(this.size));
        // Replacement strategy: Always replace (simplest)
        // or Depth-Preferred: Only replace if new depth is greater or equal
        const existing = this.table[index];
        if (!existing || depth >= existing.depth) {
            this.table[index] = { key, depth, score, type, move };
        }
    }
    lookup(key) {
        const index = Number(key % BigInt(this.size));
        const entry = this.table[index];
        if (entry && entry.key === key) {
            return entry;
        }
        return null;
    }
    clear() {
        this.table.fill(null);
    }
}
exports.TranspositionTable = TranspositionTable;
