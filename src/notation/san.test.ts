import { describe, it, expect } from 'vitest';
import { parseFEN } from '../board.js';
import { generateLegalMoves } from '../rules.js';
import { moveToSAN, parseSAN } from './san.js';

describe('SAN format support', () => {

    it('Fuzz Test: Should roundtrip all legal moves from starting position', () => {
        const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        const legalMoves = generateLegalMoves(state);

        for (const move of legalMoves) {
            const san = moveToSAN(state, move, legalMoves);
            const parsed = parseSAN(state, san);
            
            expect(parsed.from.rank).toBe(move.from.rank);
            expect(parsed.from.file).toBe(move.from.file);
            expect(parsed.to.rank).toBe(move.to.rank);
            expect(parsed.to.file).toBe(move.to.file);
            expect(parsed.promotion).toBe(move.promotion);
        }
    });

    it('Should correctly format and parse castling', () => {
        const state = parseFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
        const legalMoves = generateLegalMoves(state);

        // O-O
        const kingside = legalMoves.find(m => m.from.file === 4 && m.to.file === 6 && state.board[m.from.rank][m.from.file]?.type === 'k');
        expect(moveToSAN(state, kingside!, legalMoves)).toBe('O-O');
        expect(parseSAN(state, 'O-O').to.file).toBe(6);

        // O-O-O
        const queenside = legalMoves.find(m => m.from.file === 4 && m.to.file === 2 && state.board[m.from.rank][m.from.file]?.type === 'k');
        expect(moveToSAN(state, queenside!, legalMoves)).toBe('O-O-O');
        expect(parseSAN(state, 'O-O-O').to.file).toBe(2);
    });

    it('Should correctly disambiguate identical pieces', () => {
        // Two white knights that can jump to d2 (b1 and f3)
        const manualState = parseFEN('k7/8/8/8/8/5N2/7K/1N6 w - - 0 1');
        const legalMoves = generateLegalMoves(manualState);
        
        // b1 to d2
        const b1Nd2 = legalMoves.find(m => m.from.file === 1 && m.to.file === 3 && m.to.rank === 6);
        const f3Nd2 = legalMoves.find(m => m.from.file === 5 && m.to.file === 3 && m.to.rank === 6);

        const sanB = moveToSAN(manualState, b1Nd2!, legalMoves);
        const sanF = moveToSAN(manualState, f3Nd2!, legalMoves);

        expect(sanB).toBe('Nbd2');
        expect(sanF).toBe('Nfd2');
        expect(parseSAN(manualState, 'Nbd2').from.file).toBe(1);
    });

    it('Should correctly apply checks and mates', () => {
        // Fool's mate setup
        const state = parseFEN('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2');
        const legalMoves = generateLegalMoves(state);
        
        // Qh4#
        const mateMove = legalMoves.find(m => m.from.file === 3 && m.to.file === 7 && state.board[m.from.rank][m.from.file]?.type === 'q');
        expect(moveToSAN(state, mateMove!, legalMoves)).toBe('Qh4#');
    });

});
