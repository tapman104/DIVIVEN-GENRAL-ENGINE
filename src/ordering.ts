import { GameState, Move, PieceType } from './types.js';

const PIECE_VALUES: Record<string, number> = {
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
};

const MAX_DEPTH = 64;
export const killerMoves = Array.from({ length: MAX_DEPTH }, () => new Uint16Array(2));
export const historyTable = new Uint32Array(64 * 64);

export function clearHeuristics() {
    for (let i = 0; i < MAX_DEPTH; i++) {
        killerMoves[i][0] = 0;
        killerMoves[i][1] = 0;
    }
    historyTable.fill(0);
}

function moveToInt(move: Move): number {
    const fromIndex = move.from.rank * 8 + move.from.file;
    const toIndex = move.to.rank * 8 + move.to.file;
    return (fromIndex << 6) | toIndex;
}

export function storeKiller(depth: number, move: Move) {
    if (depth >= MAX_DEPTH || move.isCapture) return;
    const moveKey = moveToInt(move);
    if (killerMoves[depth][0] !== moveKey) {
        killerMoves[depth][1] = killerMoves[depth][0];
        killerMoves[depth][0] = moveKey;
    }
}

export function updateHistory(move: Move, depth: number) {
    if (move.isCapture) return;
    const fromIndex = move.from.rank * 8 + move.from.file;
    const toIndex = move.to.rank * 8 + move.to.file;
    const index = fromIndex * 64 + toIndex;
    historyTable[index] += depth * depth;
}

export function decayHistory() {
    for (let i = 0; i < historyTable.length; i++) {
        historyTable[i] >>= 1;
    }
}

export function scoreMove(move: Move, depth: number): number {
    let score = 0;

    // 1. Promotions (Highest priority)
    if (move.promotion) {
        return 100000 + PIECE_VALUES[move.promotion];
    }

    // 2. Captures (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
    if (move.isCapture && move.capturedPiece) {
        return 90000 + PIECE_VALUES[move.capturedPiece.type];
    }

    // 3. Killer Moves
    const key = moveToInt(move);
    if (depth >= 0 && depth < MAX_DEPTH) {
        if (killerMoves[depth][0] === key) return 80000;
        if (killerMoves[depth][1] === key) return 79000;
    }

    // 4. History Heuristics
    const fromIndex = move.from.rank * 8 + move.from.file;
    const toIndex = move.to.rank * 8 + move.to.file;
    score += historyTable[fromIndex * 64 + toIndex];

    return score;
}
