import { GameState, Color, Square, Move } from './types.js';
import { generateMoves } from './movegen.js';
import { applyMove } from './board.js';

export function isSquareAttacked(state: GameState, square: Square, attackerColor: Color): boolean {
    const { board } = state;

    // 1. Knight attacks
    const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, df] of knightOffsets) {
        const r = square.rank + dr;
        const f = square.file + df;
        if (r >= 0 && r < 8 && f >= 0 && f < 8) {
            const piece = board[r][f];
            if (piece && piece.type === 'n' && piece.color === attackerColor) return true;
        }
    }

    // 2. King attacks
    const kingOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    for (const [dr, df] of kingOffsets) {
        const r = square.rank + dr;
        const f = square.file + df;
        if (r >= 0 && r < 8 && f >= 0 && f < 8) {
            const piece = board[r][f];
            if (piece && piece.type === 'k' && piece.color === attackerColor) return true;
        }
    }

    // 3. Pawn attacks
    const pawnDirection = attackerColor === 'w' ? 1 : -1; // Attacker rank to victim rank
    const pawnFiles = [square.file - 1, square.file + 1];
    const attackerRank = square.rank + pawnDirection;
    if (attackerRank >= 0 && attackerRank < 8) {
        for (const f of pawnFiles) {
            if (f >= 0 && f < 8) {
                const piece = board[attackerRank][f];
                if (piece && piece.type === 'p' && piece.color === attackerColor) return true;
            }
        }
    }

    // 4. Sliding pieces (Rook, Bishop, Queen)
    const directions = [
        { dr: -1, df: 0, types: ['r', 'q'] },
        { dr: 1, df: 0, types: ['r', 'q'] },
        { dr: 0, df: -1, types: ['r', 'q'] },
        { dr: 0, df: 1, types: ['r', 'q'] },
        { dr: -1, df: -1, types: ['b', 'q'] },
        { dr: -1, df: 1, types: ['b', 'q'] },
        { dr: 1, df: -1, types: ['b', 'q'] },
        { dr: 1, df: 1, types: ['b', 'q'] },
    ];

    for (const { dr, df, types } of directions) {
        let r = square.rank + dr;
        let f = square.file + df;
        while (r >= 0 && r < 8 && f >= 0 && f < 8) {
            const piece = board[r][f];
            if (piece) {
                if (piece.color === attackerColor && types.includes(piece.type)) return true;
                break; // Blocked by any piece
            }
            r += dr;
            f += df;
        }
    }

    return false;
}

export function findKing(state: GameState, color: Color): Square {
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = state.board[r][f];
            if (piece && piece.type === 'k' && piece.color === color) {
                return { rank: r, file: f };
            }
        }
    }
    throw new Error(`King not found for color ${color}`);
}

export function isCheck(state: GameState, color: Color): boolean {
    const kingPos = findKing(state, color);
    const opponentColor = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(state, kingPos, opponentColor);
}

export function generateLegalMoves(state: GameState): Move[] {
    const pseudoMoves = generateMoves(state);
    const legalMoves: Move[] = [];

    for (const move of pseudoMoves) {
        const nextState = applyMove(state, move);
        // After my move, my King must not be attacked by the opponent
        const kingPos = findKing(nextState, state.turn);
        if (!isSquareAttacked(nextState, kingPos, nextState.turn)) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
}
