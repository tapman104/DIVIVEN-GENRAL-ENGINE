import { GameState, Move, PieceType, Square } from "../types.js";
import { parseSquare, squareToAlgebraic } from "../board.js";
import { generateLegalMoves } from "../rules.js";

/**
 * Converts an internal Move object to a UCI coordinate string (e.g., e2e4, e7e8q).
 */
export function moveToUci(move: Move): string {
    let base = squareToAlgebraic(move.from) + squareToAlgebraic(move.to);
    if (move.promotion) {
        base += move.promotion;
    }
    return base;
}

/**
 * Parses a UCI coordinate string into an internal Move object.
 * Throws an error if the move is invalid or not pseudo-legal/legal in the given state.
 */
export function uciToMove(state: GameState, moveStr: string): Move {
    const legalMoves = generateLegalMoves(state);
    
    // The UCI format is simply fromSquare+toSquare[+promotionItem]
    // We can evaluate equality by generating the UCI strings for all legal moves.
    for (const move of legalMoves) {
        if (moveToUci(move) === moveStr) {
            return move;
        }
    }

    throw new Error(`Invalid UCI move: ${moveStr}`);
}
