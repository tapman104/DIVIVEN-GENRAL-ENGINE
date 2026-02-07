import type { GameState, Square, Move } from './types';
import { generateMoves } from './movegen';
import { applyMove } from './board';
import { isSquareAttacked, findKing } from './attacks';

export { isSquareAttacked, isCheck, findKing, getSquareAnalysis, countAttackers } from './attacks';
export type { SquareAnalysis } from './attacks'; // Re-export for compatibility

export function generateLegalMoves(state: GameState): Move[] {
    const pseudoMoves = generateMoves(state);
    const legalMoves: Move[] = [];

    for (const move of pseudoMoves) {
        const nextState = applyMove(state, move);
        // After my move, my King must not be attacked by the opponent
        try {
            const kingPos = findKing(nextState, state.turn);
            if (!isSquareAttacked(nextState, kingPos, nextState.turn)) {
                // Check if this move gives check to the opponent?
                // For SAN generation, we might want to set isCheck.
                // But that is expensive. We can do it on demand.
                legalMoves.push(move);
            }
        } catch (e) {
            // King captured? Should not happen in legal chess.
            // But if we are testing or in weird state...
        }
    }

    return legalMoves;
}

export function parseMove(state: GameState, moveStr: string): Move | null {
    const fromStr = moveStr.substring(0, 2);
    const toStr = moveStr.substring(2, 4);
    const promo = moveStr.length > 4 ? moveStr[4] : undefined;

    const from = parseSquare(fromStr);
    const to = parseSquare(toStr);

    if (!from || !to) return null;

    const legalMoves = generateLegalMoves(state);
    return legalMoves.find(m =>
        m.from.rank === from.rank &&
        m.from.file === from.file &&
        m.to.rank === to.rank &&
        m.to.file === to.file &&
        m.promotion === promo
    ) || null;
}

function parseSquare(s: string): Square | null {
    if (s.length !== 2) return null;
    const file = s.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(s[1], 10);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return { rank, file };
}
