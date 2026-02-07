import { describe, it, expect } from 'vitest';
import { search } from './search';
import { parseFEN } from './fen';

describe('Search', () => {
    it('should take a hanging queen', () => {
        // White's turn, black queen is hanging on e4
        const fen = 'rnb1kbnr/pppp1ppp/8/8/4q3/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 1';
        const state = parseFEN(fen);
        const result = search(state, { maxDepth: 2 });

        expect(result.move).toBeDefined();
        // Knight on c3 (index 5,2) takes Queen on e4 (index 4,4)
        // from: {rank: 5, file: 2}, to: {rank: 4, file: 4}
        expect(result.move?.from).toEqual({ rank: 5, file: 2 });
        expect(result.move?.to).toEqual({ rank: 4, file: 4 });
    });

    it('should find mate in 1', () => {
        // White to move, mate on f7
        const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1';
        const state = parseFEN(fen);
        const result = search(state, { maxDepth: 2 });

        expect(result.move).toBeDefined();
        // Queen on f3 (index 5,5) takes pawn on f7 (index 1,5)
        expect(result.move?.from).toEqual({ rank: 5, file: 5 });
        expect(result.move?.to).toEqual({ rank: 1, file: 5 });
    });

    it('should recognize stalemate', () => {
        // Black to move, king on a8, white king on a6, white queen on c7 -> Stalemate
        // King on a8 is blocked by king on a6 and queen on c7, but not in check.
        const fen = 'k7/2Q5/K7/8/8/8/8/8 b - - 0 1';
        const state = parseFEN(fen);
        const result = search(state, { maxDepth: 1 });
        expect(result.score).toBe(0);
        expect(result.move).toBeNull();
    });

    it('should find mate in 1 (Scholars Mate)', () => {
        const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 3';
        const state = parseFEN(fen);
        const result = search(state, { maxDepth: 2 });
        // Queen takes f7 is mate
        expect(result.move?.to).toEqual({ rank: 1, file: 5 });
        expect(result.score).toBeGreaterThan(10000); // MATE_SCORE logic
    });
});
