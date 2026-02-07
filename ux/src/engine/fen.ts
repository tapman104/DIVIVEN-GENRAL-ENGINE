import { createEmptyBoard, PIECE_TYPE_TO_CHAR, CHAR_TO_PIECE_TYPE, squareToAlgebraic } from './board';
import type { GameState, Square, Color, CastlingRights } from './types';

export function parseFEN(fen: string): GameState {
    const parts = fen.split(' ');
    if (parts.length < 1) throw new Error('Invalid FEN');

    const [piecePlacement, turnPart, castlingPart, enPassantPart, halfMovePart, fullMovePart] = parts;

    // 1. Piece Placement
    const board = createEmptyBoard();
    const ranks = piecePlacement.split('/');
    if (ranks.length !== 8) throw new Error('Invalid piece placement in FEN');

    for (let r = 0; r < 8; r++) {
        let f = 0;
        for (const char of ranks[r]) {
            if (/\d/.test(char)) {
                f += parseInt(char, 10);
            } else {
                const type = CHAR_TO_PIECE_TYPE[char];
                const color: Color = char === char.toUpperCase() ? 'w' : 'b';
                board[r][f] = { type, color };
                f++;
            }
        }
        if (f !== 8) throw new Error(`Invalid rank layout at rank ${7 - r}`);
    }

    // 2. Turn
    const turn: Color = turnPart === 'b' ? 'b' : 'w';

    // 3. Castling Rights
    const castlingRights: CastlingRights = {
        whiteKingside: castlingPart.includes('K'),
        whiteQueenside: castlingPart.includes('Q'),
        blackKingside: castlingPart.includes('k'),
        blackQueenside: castlingPart.includes('q'),
    };

    // 4. En Passant
    let enPassantSquare: Square | null = null;
    if (enPassantPart && enPassantPart !== '-') {
        enPassantSquare = parseSquare(enPassantPart);
    }

    // 5. Clocks
    const halfMoveClock = halfMovePart ? parseInt(halfMovePart, 10) : 0;
    const fullMoveNumber = fullMovePart ? parseInt(fullMovePart, 10) : 1;

    return {
        board,
        turn,
        castlingRights,
        enPassantSquare,
        halfMoveClock,
        fullMoveNumber
    };
}

export function toFEN(state: GameState): string {
    const ranks: string[] = [];
    for (let r = 0; r < 8; r++) {
        let rankStr = '';
        let emptyCount = 0;
        for (let f = 0; f < 8; f++) {
            const piece = state.board[r][f];
            if (piece) {
                if (emptyCount > 0) {
                    rankStr += emptyCount;
                    emptyCount = 0;
                }
                const char = PIECE_TYPE_TO_CHAR[piece.type];
                rankStr += piece.color === 'w' ? char.toUpperCase() : char.toLowerCase();
            } else {
                emptyCount++;
            }
        }
        if (emptyCount > 0) rankStr += emptyCount;
        ranks.push(rankStr);
    }

    const castling = [
        state.castlingRights.whiteKingside ? 'K' : '',
        state.castlingRights.whiteQueenside ? 'Q' : '',
        state.castlingRights.blackKingside ? 'k' : '',
        state.castlingRights.blackQueenside ? 'q' : '',
    ].join('') || '-';

    const ep = state.enPassantSquare ? squareToAlgebraic(state.enPassantSquare) : '-';

    return [
        ranks.join('/'),
        state.turn,
        castling,
        ep,
        state.halfMoveClock,
        state.fullMoveNumber
    ].join(' ');
}

function parseSquare(algebraic: string): Square {
    const file = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(algebraic[1], 10);
    return { rank, file };
}
