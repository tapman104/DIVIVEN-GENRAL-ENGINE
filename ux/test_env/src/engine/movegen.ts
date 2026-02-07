import type { GameState, Move, Square, Piece, Color } from './types';
import { isSquareAttacked, generateLegalMoves } from './rules';

export function generateMoves(state: GameState): Move[] {
    const moves: Move[] = [];
    const { board, turn } = state;

    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (piece && piece.color === turn) {
                switch (piece.type) {
                    case 'p': generatePawnMoves(state, { rank: r, file: f }, moves); break;
                    case 'n': generateKnightMoves(state, { rank: r, file: f }, moves); break;
                    case 'b': generateSlidingMoves(state, { rank: r, file: f }, [[-1, -1], [-1, 1], [1, -1], [1, 1]], moves); break;
                    case 'r': generateSlidingMoves(state, { rank: r, file: f }, [[-1, 0], [1, 0], [0, -1], [0, 1]], moves); break;
                    case 'q': generateSlidingMoves(state, { rank: r, file: f }, [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]], moves); break;
                    case 'k': generateKingMoves(state, { rank: r, file: f }, moves); break;
                }
            }
        }
    }

    return moves;
}

function generatePawnMoves(state: GameState, from: Square, moves: Move[]) {
    const direction = state.turn === 'w' ? -1 : 1;
    const startRank = state.turn === 'w' ? 6 : 1;
    const promoRank = state.turn === 'w' ? 0 : 7;

    // 1. Pushes
    const to1 = { rank: from.rank + direction, file: from.file };
    if (to1.rank >= 0 && to1.rank < 8 && !state.board[to1.rank][to1.file]) {
        addPawnMove(from, to1, moves, promoRank);

        if (from.rank === startRank) {
            const to2 = { rank: from.rank + 2 * direction, file: from.file };
            if (!state.board[to2.rank][to2.file]) {
                addPawnMove(from, to2, moves, promoRank);
            }
        }
    }

    // 2. Captures
    const captureFiles = [from.file - 1, from.file + 1];
    for (const f of captureFiles) {
        if (f >= 0 && f < 8) {
            const targetRank = from.rank + direction;
            if (targetRank < 0 || targetRank >= 8) continue;

            const targetPiece = state.board[targetRank][f];
            if (targetPiece && targetPiece.color !== state.turn) {
                addPawnMove(from, { rank: targetRank, file: f }, moves, promoRank, targetPiece);
            } else if (state.enPassantSquare && targetRank === state.enPassantSquare.rank && f === state.enPassantSquare.file) {
                const epMove = createMove(from, { rank: targetRank, file: f });
                epMove.isEnPassant = true;
                epMove.isCapture = true;
                moves.push(epMove);
            }
        }
    }
}

function addPawnMove(from: Square, to: Square, moves: Move[], promoRank: number, capturedPiece?: Piece) {
    if (to.rank === promoRank) {
        const types: ('q' | 'r' | 'b' | 'n')[] = ['q', 'r', 'b', 'n'];
        for (const type of types) {
            const move = createMove(from, to, capturedPiece);
            move.promotion = type;
            moves.push(move);
        }
    } else {
        moves.push(createMove(from, to, capturedPiece));
    }
}

function generateKnightMoves(state: GameState, from: Square, moves: Move[]) {
    const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    for (const [dr, df] of offsets) {
        const to = { rank: from.rank + dr, file: from.file + df };
        if (to.rank >= 0 && to.rank < 8 && to.file >= 0 && to.file < 8) {
            const target = state.board[to.rank][to.file];
            if (!target || target.color !== state.turn) {
                moves.push(createMove(from, to, target || undefined));
            }
        }
    }
}

function generateSlidingMoves(state: GameState, from: Square, directions: number[][], moves: Move[]) {
    for (const [dr, df] of directions) {
        let r = from.rank + dr;
        let f = from.file + df;
        while (r >= 0 && r < 8 && f >= 0 && f < 8) {
            const target = state.board[r][f];
            if (target) {
                if (target.color !== state.turn) {
                    moves.push(createMove(from, { rank: r, file: f }, target));
                }
                break; // Stop at any piece
            }
            moves.push(createMove(from, { rank: r, file: f }));
            r += dr;
            f += df;
        }
    }
}

function generateKingMoves(state: GameState, from: Square, moves: Move[]) {
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    for (const [dr, df] of offsets) {
        const to = { rank: from.rank + dr, file: from.file + df };
        if (to.rank >= 0 && to.rank < 8 && to.file >= 0 && to.file < 8) {
            const target = state.board[to.rank][to.file];
            if (!target || target.color !== state.turn) {
                moves.push(createMove(from, to, target || undefined));
            }
        }
    }

    // Castling
    const { castlingRights, turn } = state;
    const opponentColor: Color = turn === 'w' ? 'b' : 'w';

    if (turn === 'w') {
        if (castlingRights.whiteKingside) {
            if (!state.board[7][5] && !state.board[7][6]) {
                if (!isSquareAttacked(state, { rank: 7, file: 4 }, opponentColor) &&
                    !isSquareAttacked(state, { rank: 7, file: 5 }, opponentColor) &&
                    !isSquareAttacked(state, { rank: 7, file: 6 }, opponentColor)) {
                    moves.push(createCastlingMove(from, { rank: 7, file: 6 }));
                }
            }
        }
        if (castlingRights.whiteQueenside) {
            if (!state.board[7][1] && !state.board[7][2] && !state.board[7][3]) {
                if (!isSquareAttacked(state, { rank: 7, file: 4 }, opponentColor) &&
                    !isSquareAttacked(state, { rank: 7, file: 3 }, opponentColor) &&
                    !isSquareAttacked(state, { rank: 7, file: 2 }, opponentColor)) {
                    moves.push(createCastlingMove(from, { rank: 7, file: 2 }));
                }
            }
        }
    } else {
        if (castlingRights.blackKingside) {
            if (!state.board[0][5] && !state.board[0][6]) {
                if (!isSquareAttacked(state, { rank: 0, file: 4 }, opponentColor) &&
                    !isSquareAttacked(state, { rank: 0, file: 5 }, opponentColor) &&
                    !isSquareAttacked(state, { rank: 0, file: 6 }, opponentColor)) {
                    moves.push(createCastlingMove(from, { rank: 0, file: 6 }));
                }
            }
        }
        if (castlingRights.blackQueenside) {
            if (!state.board[0][1] && !state.board[0][2] && !state.board[0][3]) {
                if (!isSquareAttacked(state, { rank: 0, file: 4 }, opponentColor) &&
                    !isSquareAttacked(state, { rank: 0, file: 3 }, opponentColor) &&
                    !isSquareAttacked(state, { rank: 0, file: 2 }, opponentColor)) {
                    moves.push(createCastlingMove(from, { rank: 0, file: 2 }));
                }
            }
        }
    }
}

function createCastlingMove(from: Square, to: Square): Move {
    const move = createMove(from, to);
    move.isCastling = true;
    return move;
}

function createMove(from: Square, to: Square, capturedPiece?: Piece): Move {
    return {
        from,
        to,
        capturedPiece,
        isCapture: !!capturedPiece,
        isCheck: false,
        isCastling: false,
        isEnPassant: false
    };
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
    const rank = 8 - parseInt(s[1]);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return { rank, file };
}
