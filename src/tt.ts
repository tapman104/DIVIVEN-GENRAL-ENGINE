import { Move } from './types.js';

export enum NodeType {
    EXACT,
    LOWER_BOUND,
    UPPER_BOUND
}

export interface TTEntry {
    key: bigint;
    depth: number;
    score: number;
    type: NodeType;
    move: Move | null;
}

export class TranspositionTable {
    private table: (TTEntry | null)[];
    private size: number;

    constructor(sizeMB: number) {
        // Roughly 64 bytes per entry in V8 (estimates vary, but let's be conservative)
        // 1MB = 1048576 bytes
        const entrySize = 100; // conservative estimate for object overhead
        this.size = Math.floor((sizeMB * 1024 * 1024) / entrySize);
        this.table = new Array(this.size).fill(null);
    }

    public store(key: bigint, depth: number, score: number, type: NodeType, move: Move | null) {
        const index = Number(key % BigInt(this.size));

        // Replacement strategy: Always replace (simplest)
        // or Depth-Preferred: Only replace if new depth is greater or equal
        const existing = this.table[index];
        if (!existing || depth >= existing.depth) {
            this.table[index] = { key, depth, score, type, move };
        }
    }

    public lookup(key: bigint): TTEntry | null {
        const index = Number(key % BigInt(this.size));
        const entry = this.table[index];
        if (entry && entry.key === key) {
            return entry;
        }
        return null;
    }

    public clear() {
        this.table.fill(null);
    }
}
