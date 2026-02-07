"use strict";
// Simple Polyglot-style hash or just FEN-based dictionary for now
// Using simplified FEN (no move counters) for better hits
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENING_BOOK = void 0;
exports.getBookMove = getBookMove;
exports.OPENING_BOOK = {
    // START POS
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -": ["e2e4", "d2d4", "g1f3", "c2c4", "b2b3"],
    // --- E4 COMPLEX ---
    // E4 RESPONSES
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -": ["c7c5", "e7e5", "e7e6", "c7c6", "d7d6", "g8f6"], // Sicilian, Open, French, Caro, Pirc, Alekhine
    // OPEN GAME (e5) -> Nf3
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": ["g1f3", "f1c4", "b1c3", "f2f4"],
    // OPEN GAME (e5 Nf3) -> Nc6
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -": ["b8c6", "g8f6", "d7d6"],
    // SPANISH / ITALIAN (Nc6) -> Bb5 or Bc4
    "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -": ["f1b5", "f1c4", "c2c3", "d2d4"],
    // SICILIAN (c5) -> Nf3
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": ["g1f3", "c2c3", "b1c3", "f2f4"],
    // FRENCH (e6) -> d4
    "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": ["d2d4", "d2d3", "b1c3"],
    // FRENCH (e6 d4 d5) -> Nc3 / e5 / Nd2
    "rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -": ["b1c3", "e4e5", "b1d2", "e4d5"],
    // CARO-KANN (c6) -> d4
    "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": ["d2d4", "g1f3", "b1c3"],
    // --- D4 COMPLEX ---
    // D4 RESPONSES
    "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -": ["d7d5", "g8f6", "e7e6", "f7f5", "c7c5"],
    // QG (d4 d5 c4)
    "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -": ["e7e6", "c7c6", "d5c4", "g8f6"],
    // INDIAN (Nf6) -> c4
    "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -": ["c2c4", "g1f3", "c1g5"],
    // NIMZO/KID (Nf6 c4) -> e6 / g6
    "rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -": ["e7e6", "g7g6", "c7c5", "c7c6"],
    // --- OTHERS ---
    // ENGLISH (c4) -> e5 / c5 / Nf6
    "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -": ["e7e5", "c7c5", "g8f6", "e7e6"],
    // RETI (Nf3) -> d5 / Nf6
    "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -": ["d7d5", "g8f6", "c7c5"]
};
// Helper to normalize FEN for lookup (strip counters)
function normalizeFen(fen) {
    const parts = fen.split(' ');
    // Keep: Board, Turn, Castling, EnPassant. Drop: Halfmove, Fullmove.
    return parts.slice(0, 4).join(' ');
}
function getBookMove(fen) {
    const key = normalizeFen(fen);
    const moves = exports.OPENING_BOOK[key];
    if (!moves || moves.length === 0)
        return null;
    // Pick random move from book for variety
    const idx = Math.floor(Math.random() * moves.length);
    return moves[idx];
}
