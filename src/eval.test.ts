import { describe, it, expect } from 'vitest';
import { evaluate } from './eval.js';
import { parseFEN } from './board.js';

describe('Evaluation', () => {
    it('should be symmetric for the starting position', () => {
        const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        expect(evaluate(state)).toBe(0);
    });

    it('should favor white when up a queen', () => {
        const state = parseFEN('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        const score = evaluate(state);
        expect(score).toBeGreaterThan(500);
    });

    it('should favor black when up a pawn', () => {
        // White is missing a pawn on d2
        const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1');
        const score = evaluate(state);
        expect(score).toBeLessThan(-50);
    });
});
