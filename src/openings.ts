export interface OpeningMove {
    from: string;
    to: string;
}

/**
 * Basic opening book with FEN as key and array of PGN-like moves as values.
 * Moves are stored as 'e2e4' strings to be converted to Move objects.
 */
export const OPENING_BOOK: Record<string, string[]> = {
    // Starting Position
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': [
        'e2e4', 'd2d4', 'g1f3', 'c2c4'
    ],
    // Response to e4 (Open Game)
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': [
        'e7e5', 'c7c5', 'e7e6'
    ],
    // Response to d4 (Closed Game)
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPPP1PPP/RNBQKBNR b KQkq d3 0 1': [
        'd7d5', 'g8f6'
    ],
    // King's Indian defense setup after d4 Nf6 c4
    'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2': [
        'g7g6'
    ]
};

export function getBookMove(fen: string): string | null {
    // 1. Normalize FEN (remove halfmove/fullmove clocks for matching)
    const components = fen.split(' ');
    const normalizedFen = components.slice(0, 4).join(' '); // board, turn, castling, ep

    for (const bookFen in OPENING_BOOK) {
        if (bookFen.startsWith(normalizedFen)) {
            const moves = OPENING_BOOK[bookFen];
            return moves[Math.floor(Math.random() * moves.length)];
        }
    }
    return null;
}
