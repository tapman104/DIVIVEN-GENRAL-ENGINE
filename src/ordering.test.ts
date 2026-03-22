import { describe, it, expect } from 'vitest';
import { scoreMove } from './ordering.js';
import { parseFEN } from './board.js';
import { generateLegalMoves } from './rules.js';

describe('Move Scoring', () => {
    it('should prioritize captures over non-captures', () => {
        // White to move, can capture a queen or move a pawn
        const fen = 'rnb1kbnr/pppp1ppp/8/8/4q3/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 1';
        const state = parseFEN(fen);
        const moves = generateLegalMoves(state);
        
        let bestMove = moves[0];
        let bestScore = scoreMove(bestMove, 0);

        for (const move of moves) {
            const score = scoreMove(move, 0);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        // The first move should be the capture (Knight takes Queen)
        expect(bestMove.isCapture).toBe(true);
        expect(bestMove.capturedPiece?.type).toBe('q');
    });

    it('should prioritize promotions', () => {
        // White pawn on 7th rank can promote
        const fen = '8/4P3/8/8/8/8/8/k6K w - - 0 1';
        const state = parseFEN(fen);
        const moves = generateLegalMoves(state);
        
        let bestMove = moves[0];
        let bestScore = scoreMove(bestMove, 0);

        for (const move of moves) {
            const score = scoreMove(move, 0);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        expect(bestMove.promotion).toBeDefined();
    });
});
