import { GameState } from './types.js';
import { generateLegalMoves } from './rules.js';
import { applyMove } from './board.js';

export function perft(state: GameState, depth: number): number {
    if (depth === 0) return 1;

    const moves = generateLegalMoves(state);
    if (depth === 1) return moves.length;

    let nodes = 0;
    for (const move of moves) {
        nodes += perft(applyMove(state, move), depth - 1);
    }
    return nodes;
}
