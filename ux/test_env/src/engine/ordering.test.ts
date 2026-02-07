import { describe, it, expect } from 'vitest';
import { orderMoves } from './ordering.js';
import { parseFEN } from './board.js';
import { generateLegalMoves } from './rules.js';

describe('Move Ordering', () => {
    it('should prioritize captures over non-captures', () => {
        // White to move, can capture a queen or move a pawn
        const fen = 'rnb1kbnr/pppp1ppp/8/8/4q3/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 1';
        const state = parseFEN(fen);
        const moves = generateLegalMoves(state);
        const ordered = orderMoves(state, moves);

        // The first move should be the capture (Knight takes Queen)
        expect(ordered[0].isCapture).toBe(true);
        expect(ordered[0].capturedPiece?.type).toBe('q');
    });

    it('should prioritize promotions', () => {
        // White pawn on 7th rank can promote
        const fen = '8/4P3/8/8/8/8/8/k6K w - - 0 1';
        const state = parseFEN(fen);
        const moves = generateLegalMoves(state);
        const ordered = orderMoves(state, moves);

        expect(ordered[0].promotion).toBeDefined();
    });
});
