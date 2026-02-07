import { describe, it, expect } from 'vitest';
import { perft } from './perft';
import { parseFEN } from './fen';

describe('Perft Depth 1', () => {
    it('should return 20 for the starting position at depth 1', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const state = parseFEN(fen);
        expect(perft(state, 1)).toBe(20);
        // 16 pawn moves + 4 knight moves
    });

    it('should return 400 for depth 2', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const state = parseFEN(fen);
        expect(perft(state, 2)).toBe(400);
    });

    it('should return 8902 for depth 3', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const state = parseFEN(fen);
        expect(perft(state, 3)).toBe(8902);
    });
});

describe('Perft Kiwipete', () => {
    const KIP_FEN = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

    it('should return 48 for depth 1', () => {
        const state = parseFEN(KIP_FEN);
        expect(perft(state, 1)).toBe(48);
    });

    it('should return 2039 for depth 2', () => {
        const state = parseFEN(KIP_FEN);
        expect(perft(state, 2)).toBe(2039);
    });

    it('should return 97862 for depth 3', () => {
        const state = parseFEN(KIP_FEN);
        expect(perft(state, 3)).toBe(97862);
    });
});
