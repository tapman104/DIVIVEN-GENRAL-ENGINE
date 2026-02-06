export type Color = 'w' | 'b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
    type: PieceType;
    color: Color;
}

export interface Square {
    rank: number; // 0-7
    file: number; // 0-7
}

export type Board = (Piece | null)[][];

export interface CastlingRights {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
}

export interface GameState {
    board: Board;
    turn: Color;
    castlingRights: CastlingRights;
    enPassantSquare: Square | null;
    halfMoveClock: number;
    fullMoveNumber: number;
}

export interface Move {
    from: Square;
    to: Square;
    promotion?: PieceType;

    // Metadata
    capturedPiece?: Piece;
    isCapture: boolean;
    isCheck: boolean;
    isCastling: boolean;
    isEnPassant: boolean;
}
