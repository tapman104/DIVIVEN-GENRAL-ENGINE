import { describe, it, expect } from 'vitest';
import { getBookMove } from './openings';

describe('Opening Book', () => {
    it('should return a valid starting move for the initial position', () => {
        const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const move = getBookMove(startFen);
        expect(['e2e4', 'd2d4', 'g1f3', 'c2c4']).toContain(move);
    });

    it('should return a move for the Sicilian Defense (response to e4)', () => {
        const sicilianFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
        const move = getBookMove(sicilianFen);
        expect(['e7e5', 'c7c5', 'e7e6']).toContain(move);
    });

    it('should return null for an unknown position', () => {
        const unknownFen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
        const move = getBookMove(unknownFen);
        expect(move).toBeNull();
    });

    it('should ignore move clocks when matching', () => {
        // Halfmove 10, Fullmove 5 instead of 0, 1
        const clockFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 10 5';
        const move = getBookMove(clockFen);
        expect(['e2e4', 'd2d4', 'g1f3', 'c2c4']).toContain(move);
    });
});
