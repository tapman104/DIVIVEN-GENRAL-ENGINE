import { GameState, Move } from '../types.js';
import { generateLegalMoves, isCheck } from '../rules.js';
import { applyMove, squareToAlgebraic, getPiece } from '../board.js';
import { normalizeSAN } from '../utils/normalizeSAN.js';

const PIECE_NAMES: Record<string, string> = {
    'n': 'N', 'b': 'B', 'r': 'R', 'q': 'Q', 'k': 'K', 'p': ''
};

export function moveToSAN(state: GameState, move: Move, legalMoves: Move[]): string {
    const piece = getPiece(state, move.from);
    if (!piece) throw new Error("No piece at source square");

    const toAlg = squareToAlgebraic(move.to);

    // 1. Castling
    if (piece.type === 'k' && Math.abs(move.from.file - move.to.file) === 2) {
        let san = move.to.file > move.from.file ? "O-O" : "O-O-O";
        return appendCheckMate(state, move, san);
    }

    let san = PIECE_NAMES[piece.type];

    // 2. Disambiguation
    // Find other pieces of the SAME type and COLOR that can move to the SAME square
    if (piece.type !== 'p') {
        const matchingMoves = legalMoves.filter(m => {
            if (m.from.rank === move.from.rank && m.from.file === move.from.file) return false;
            if (m.to.rank !== move.to.rank || m.to.file !== move.to.file) return false;
            
            const mPiece = getPiece(state, m.from);
            return mPiece && mPiece.type === piece.type && mPiece.color === piece.color;
        });

        if (matchingMoves.length > 0) {
            // Need disambiguation
            const sameFile = matchingMoves.some(m => m.from.file === move.from.file);
            const sameRank = matchingMoves.some(m => m.from.rank === move.from.rank);
            const fromAlg = squareToAlgebraic(move.from);

            if (!sameFile) {
                san += fromAlg[0]; // file
            } else if (!sameRank) {
                san += fromAlg[1]; // rank
            } else {
                san += fromAlg; // both
            }
        }
    }

    // 3. Captures
    const isCapture = move.isCapture || getPiece(state, move.to) || move.isEnPassant || 
                      (piece.type === 'p' && move.from.file !== move.to.file);

    if (isCapture) {
        if (piece.type === 'p') {
            const fromAlg = squareToAlgebraic(move.from);
            san += fromAlg[0];
        }
        san += "x";
    }

    san += toAlg;

    // 4. Promotions
    if (move.promotion) {
        san += "=" + PIECE_NAMES[move.promotion];
    }

    // 5. Check and Checkmate
    return appendCheckMate(state, move, san);
}

function appendCheckMate(state: GameState, move: Move, san: string): string {
    const nextState = applyMove(state, move);
    const opponent = nextState.turn;
    const isNextCheck = isCheck(nextState, opponent);
    
    if (isNextCheck) {
        const nextLegal = generateLegalMoves(nextState);
        if (nextLegal.length === 0) {
            san += "#"; // Checkmate
        } else {
            san += "+"; // Check
        }
    }
    return san;
}

export function parseSAN(state: GameState, san: string): Move {
    const normalized = normalizeSAN(san);
    const legalMoves = generateLegalMoves(state);

    for (const move of legalMoves) {
        const moveSan = moveToSAN(state, move, legalMoves);
        if (moveSan === normalized) {
            return move;
        }
    }

    throw new Error(`Invalid SAN move: ${san} in the current position`);
}
