/**
 * Curated Grandmaster Opening Book
 * Format: FEN (first 4 parts) -> Array of UCI moves with weights
 */
export const GM_BOOK: Record<string, { m: string, w: number }[]> = {
    // Starting Position
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
        { m: 'e2e4', w: 100 }, { m: 'd2d4', w: 80 }, { m: 'g1f3', w: 50 }, { m: 'c2c4', w: 40 }
    ],
    // Response to e4
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': [
        { m: 'e7e5', w: 100 }, { m: 'c7c5', w: 90 }, { m: 'e7e6', w: 50 }
    ],
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [{ m: 'g1f3', w: 100 }],
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [{ m: 'd7d6', w: 100 }, { m: 'e7e6', w: 80 }, { m: 'b8c6', w: 70 }],
    'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': [{ m: 'c5d4', w: 100 }],

    // Queen's Gambit
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPPP1PPP/RNBQKBNR b KQkq d3': [{ m: 'd7d5', w: 100 }, { m: 'g8f6', w: 90 }],
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [{ m: 'c2c4', w: 100 }],
    'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -': [{ m: 'e7e6', w: 100 }, { m: 'c7c6', w: 80 }, { m: 'd5c4', w: 50 }],

    // King's Indian
    'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -': [{ m: 'g7g6', w: 100 }],
    'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [{ m: 'b1c3', w: 100 }],
    'r1bqkb1r/pppppp1p/2n2np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': [{ m: 'e2e4', w: 100 }],

    // London System
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPPP1PPP/RNBQKBNR w KQkq -': [{ m: 'd2d4', w: 100 }, { m: 'g1f3', w: 80 }],
    'rnbqkbnr/pppppppp/8/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq -': [{ m: 'd7d5', w: 100 }],
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq -': [{ m: 'c1f4', w: 100 }]
};
