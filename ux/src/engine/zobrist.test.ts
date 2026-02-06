import { describe, it, expect } from 'vitest';
import { generateZobristKey } from './zobrist.js';
import { parseFEN } from './board.js';

describe('Zobrist Hashing', () => {
    it('should generate the same key for the same position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const state1 = parseFEN(fen);
        const state2 = parseFEN(fen);
        expect(generateZobristKey(state1)).toBe(generateZobristKey(state2));
    });

    it('should generate different keys for different positions', () => {
        const state1 = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        const state2 = parseFEN('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(generateZobristKey(state1)).not.toBe(generateZobristKey(state2));
    });

    it('should reflect turn change in the hash', () => {
        const state1 = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        const state2 = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
        expect(generateZobristKey(state1)).not.toBe(generateZobristKey(state2));
    });
});
