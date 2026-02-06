import { Board, Color, GameState, Piece, PieceType, Square, CastlingRights, Move } from './types.js';

export function createEmptyBoard(): Board {
    const board: Board = [];
    for (let r = 0; r < 8; r++) {
        board[r] = new Array(8).fill(null);
    }
    return board;
}

export function cloneState(state: GameState): GameState {
    return {
        board: state.board.map(row => row.map(piece => piece ? { ...piece } : null)),
        turn: state.turn,
        castlingRights: { ...state.castlingRights },
        enPassantSquare: state.enPassantSquare ? { ...state.enPassantSquare } : null,
        halfMoveClock: state.halfMoveClock,
        fullMoveNumber: state.fullMoveNumber,
    };
}

const CHAR_TO_PIECE_TYPE: Record<string, PieceType> = {
    p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k',
    P: 'p', N: 'n', B: 'b', R: 'r', Q: 'q', K: 'k'
};

const PIECE_TYPE_TO_CHAR: Record<PieceType, string> = {
    p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k'
};

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

function squareToAlgebraic(square: Square): string {
    const file = String.fromCharCode('a'.charCodeAt(0) + square.file);
    const rank = (8 - square.rank).toString();
    return file + rank;
}

export function renderBoard(board: Board): string {
    let output = '  a b c d e f g h\n';
    output += '  ----------------\n';
    for (let r = 0; r < 8; r++) {
        output += `${8 - r}|`;
        for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (piece) {
                const char = PIECE_TYPE_TO_CHAR[piece.type];
                output += piece.color === 'w' ? char.toUpperCase() + ' ' : char.toLowerCase() + ' ';
            } else {
                output += '. ';
            }
        }
        output += `|${8 - r}\n`;
    }
    output += '  ----------------\n';
    output += '  a b c d e f g h';
    return output;
}

export function getPiece(state: GameState, square: Square): Piece | null {
    return state.board[square.rank][square.file];
}

export function applyMove(state: GameState, move: Move): GameState {
    const nextState = cloneState(state);
    const { from, to, promotion } = move;
    const piece = nextState.board[from.rank][from.file];

    if (!piece) throw new Error('No piece at from square');

    // Handle capture metadata for record keeping if not already set
    if (!move.capturedPiece) {
        move.capturedPiece = nextState.board[to.rank][to.file] || undefined;
        move.isCapture = !!move.capturedPiece;
    }

    // 1. Move piece
    nextState.board[to.rank][to.file] = promotion
        ? { type: promotion, color: piece.color }
        : piece;
    nextState.board[from.rank][from.file] = null;

    // 2. Handle Castling
    if (piece.type === 'k') {
        // Disable all castling for this color
        if (piece.color === 'w') {
            nextState.castlingRights.whiteKingside = false;
            nextState.castlingRights.whiteQueenside = false;
        } else {
            nextState.castlingRights.blackKingside = false;
            nextState.castlingRights.blackQueenside = false;
        }

        // Move Rook if it was a castling move
        if (Math.abs(from.file - to.file) === 2) {
            const isKingside = to.file > from.file;
            const rookFileFrom = isKingside ? 7 : 0;
            const rookFileTo = isKingside ? 5 : 3;
            const rook = nextState.board[from.rank][rookFileFrom];
            nextState.board[from.rank][rookFileTo] = rook;
            nextState.board[from.rank][rookFileFrom] = null;
        }
    }

    // Disable castling if Rook is moved or captured
    if (piece.type === 'r') {
        if (from.rank === 7 && from.file === 7) nextState.castlingRights.whiteKingside = false;
        if (from.rank === 7 && from.file === 0) nextState.castlingRights.whiteQueenside = false;
        if (from.rank === 0 && from.file === 7) nextState.castlingRights.blackKingside = false;
        if (from.rank === 0 && from.file === 0) nextState.castlingRights.blackQueenside = false;
    }
    // If a Rook is captured at its starting square
    if (move.isCapture) {
        if (to.rank === 7 && to.file === 7) nextState.castlingRights.whiteKingside = false;
        if (to.rank === 7 && to.file === 0) nextState.castlingRights.whiteQueenside = false;
        if (to.rank === 0 && to.file === 7) nextState.castlingRights.blackKingside = false;
        if (to.rank === 0 && to.file === 0) nextState.castlingRights.blackQueenside = false;
    }

    // 3. Handle En Passant
    if (piece.type === 'p') {
        // Capture the pawn
        if (move.isEnPassant || (state.enPassantSquare && to.rank === state.enPassantSquare.rank && to.file === state.enPassantSquare.file)) {
            const captureRank = from.rank;
            nextState.board[captureRank][to.file] = null;
            move.isEnPassant = true;
            move.isCapture = true;
        }

        // Set new EP square if double push
        if (Math.abs(from.rank - to.rank) === 2) {
            nextState.enPassantSquare = { rank: (from.rank + to.rank) / 2, file: from.file };
        } else {
            nextState.enPassantSquare = null;
        }
    } else {
        nextState.enPassantSquare = null;
    }

    // 4. Update Clocks
    if (piece.type === 'p' || move.isCapture) {
        nextState.halfMoveClock = 0;
    } else {
        nextState.halfMoveClock++;
    }

    if (state.turn === 'b') {
        nextState.fullMoveNumber++;
    }

    nextState.turn = state.turn === 'w' ? 'b' : 'w';

    return nextState;
}
