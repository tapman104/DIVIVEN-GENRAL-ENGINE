import { describe, it, expect } from 'vitest';
import { cloneState, renderBoard, getPiece } from './board';
import { parseFEN, toFEN } from './fen';

describe('FEN Parsing', () => {
    it('should parse the starting position correctly', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const state = parseFEN(fen);
        expect(state.turn).toBe('w');
        expect(state.castlingRights.whiteKingside).toBe(true);
        expect(state.castlingRights.whiteQueenside).toBe(true);
        expect(state.castlingRights.blackKingside).toBe(true);
        expect(state.castlingRights.blackQueenside).toBe(true);
        expect(state.enPassantSquare).toBeNull();
        expect(state.halfMoveClock).toBe(0);
        expect(state.fullMoveNumber).toBe(1);
        expect(state.board[0][0]).toEqual({ type: 'r', color: 'b' });
        expect(state.board[7][7]).toEqual({ type: 'r', color: 'w' });
    });

    it('should parse a complex mid-game position', () => {
        const fen = 'r1bqk2r/pp2bppp/2nppn2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq - 0 8';
        const state = parseFEN(fen);
        expect(state.turn).toBe('w');
        expect(state.fullMoveNumber).toBe(8);
        // Pieces checks
        expect(getPiece(state, { rank: 4, file: 3 })).toEqual({ type: 'n', color: 'w' }); // d4
        expect(getPiece(state, { rank: 2, file: 2 })).toEqual({ type: 'n', color: 'b' }); // c6
    });

    it('should handle all castling rights combinations', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
        const state = parseFEN(fen);
        expect(state.castlingRights.whiteKingside).toBe(false);
        expect(state.castlingRights.whiteQueenside).toBe(false);
        expect(state.castlingRights.blackKingside).toBe(false);
        expect(state.castlingRights.blackQueenside).toBe(false);

        const fen2 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Kq - 0 1';
        const state2 = parseFEN(fen2);
        expect(state2.castlingRights.whiteKingside).toBe(true);
        expect(state2.castlingRights.blackQueenside).toBe(true);
    });

    it('should parse en passant square correctly', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
        const state = parseFEN(fen);
        expect(state.enPassantSquare).toEqual({ rank: 5, file: 4 }); // e3 -> row 5 (8-3), col 4
    });

    it('should handle black to move', () => {
        const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
        expect(state.turn).toBe('b');
    });

    it('should parse clocks correctly', () => {
        const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 10 25');
        expect(state.halfMoveClock).toBe(10);
        expect(state.fullMoveNumber).toBe(25);
    });

    it('should throw error for invalid FEN piece placement', () => {
        expect(() => parseFEN('8/8/8/8/8/8/8 w KQkq - 0 1')).toThrow(); // Missing ranks
    });
});

describe('FEN Generation', () => {
    it('should round-trip the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const state = parseFEN(fen);
        expect(toFEN(state)).toBe(fen);
    });

    it('should round-trip a complex position', () => {
        const fen = 'r1bqk2r/pp2bppp/2nppn2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq - 0 8';
        const state = parseFEN(fen);
        expect(toFEN(state)).toBe(fen);
    });

    it('should round-trip en passant', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
        const state = parseFEN(fen);
        expect(toFEN(state)).toBe(fen);
    });
});

describe('Board Operations', () => {
    it('should clone the state independently', () => {
        const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        const cloned = cloneState(state);

        // Mutate clone
        cloned.board[0][0] = null;
        cloned.turn = 'b';
        cloned.castlingRights.whiteKingside = false;

        expect(state.board[0][0]).not.toBeNull();
        expect(state.turn).toBe('w');
        expect(state.castlingRights.whiteKingside).toBe(true);
    });

    it('should render ASCII board (smoke test)', () => {
        const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        const output = renderBoard(state.board);
        expect(output).toContain('r n b q k b n r');
        expect(output).toContain('P P P P P P P P');
    });

    it('should handle pieces on edge squares a1 and h8', () => {
        const state = parseFEN('R7/8/8/8/8/8/8/7r w - - 0 1');
        expect(getPiece(state, { rank: 0, file: 0 })).toEqual({ type: 'r', color: 'w' }); // a8 in FEN but rank index 0
        // Wait, FEN starts with rank 8. R7 means rank 8 has Rook at a8.
        // Index 0,0 is a8.
        expect(getPiece(state, { rank: 7, file: 7 })).toEqual({ type: 'r', color: 'b' }); // h1 index 7,7
    });

    it('should handle a FEN with many small empty square counts', () => {
        const fen = '1p1p1p1p/p1p1p1p1/1p1p1p1p/p1p1p1p1/1P1P1P1P/P1P1P1P1/1P1P1P1P/P1P1P1P1 w - - 0 1';
        const state = parseFEN(fen);
        expect(toFEN(state)).toBe(fen);
    });
});
