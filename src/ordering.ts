import { GameState, Move, PieceType } from './types.js';

const PIECE_VALUES: Record<PieceType, number> = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
};

export function orderMoves(state: GameState, moves: Move[]): Move[] {
    return moves.sort((a, b) => {
        const scoreA = getMovePriority(a);
        const scoreB = getMovePriority(b);
        return scoreB - scoreA;
    });
}

function getMovePriority(move: Move): number {
    let score = 0;

    // 1. Promotions (Highest priority)
    if (move.promotion) {
        score += 1000 + PIECE_VALUES[move.promotion];
    }

    // 2. Captures (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
    if (move.isCapture && move.capturedPiece) {
        // Basic MVV-LVA: Value of victim - Value of attacker
        // However, simplified for now: just value of victim
        // We'll also use move.from to get attacker piece type if needed later
        score += 500 + PIECE_VALUES[move.capturedPiece.type];
    }

    // 3. Checks
    if (move.isCheck) {
        score += 100;
    }

    return score;
}
