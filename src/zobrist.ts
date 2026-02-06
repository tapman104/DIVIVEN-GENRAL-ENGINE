import { GameState, Color, PieceType } from './types.js';

// Random values for each piece on each square
// [color][pieceType][rank][file]
const PIECE_KEYS: number[][][][] = [];
const TURN_KEY: number = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
const CASTLING_KEYS: number[] = []; // 4 keys
const EN_PASSANT_KEYS: number[] = []; // 8 keys (one for each file)

// Initializing random keys
const PIECE_TYPES: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];
for (let c = 0; c < 2; c++) {
    PIECE_KEYS[c] = [];
    for (let t = 0; t < 6; t++) {
        PIECE_KEYS[c][t] = [];
        for (let r = 0; r < 8; r++) {
            PIECE_KEYS[c][t][r] = [];
            for (let f = 0; f < 8; f++) {
                PIECE_KEYS[c][t][r][f] = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
            }
        }
    }
}

for (let i = 0; i < 4; i++) CASTLING_KEYS[i] = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
for (let i = 0; i < 8; i++) EN_PASSANT_KEYS[i] = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

export function generateZobristKey(state: GameState): bigint {
    let key = BigInt(0);

    // 1. Pieces
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = state.board[r][f];
            if (piece) {
                const colorIdx = piece.color === 'w' ? 0 : 1;
                const typeIdx = PIECE_TYPES.indexOf(piece.type);
                key ^= BigInt(PIECE_KEYS[colorIdx][typeIdx][r][f]);
            }
        }
    }

    // 2. Turn
    if (state.turn === 'b') {
        key ^= BigInt(TURN_KEY);
    }

    // 3. Castling
    if (state.castlingRights.whiteKingside) key ^= BigInt(CASTLING_KEYS[0]);
    if (state.castlingRights.whiteQueenside) key ^= BigInt(CASTLING_KEYS[1]);
    if (state.castlingRights.blackKingside) key ^= BigInt(CASTLING_KEYS[2]);
    if (state.castlingRights.blackQueenside) key ^= BigInt(CASTLING_KEYS[3]);

    // 4. En Passant
    if (state.enPassantSquare) {
        key ^= BigInt(EN_PASSANT_KEYS[state.enPassantSquare.file]);
    }

    return key;
}
