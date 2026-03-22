import { describe, it, expect } from 'vitest';
import { parsePGN } from './pgn/parse.js';
import { stringifyPGN } from './pgn/stringify.js';
import { moveToSAN, parseSAN } from './notation/san.js';
import { moveToUci, uciToMove } from './notation/uciMove.js';
import { parseFEN, applyMove, toFEN } from './board.js';
import { generateLegalMoves } from './rules.js';

describe('Cross-System Consistency', () => {

    it('Should cleanly convert and round-trip across PGN, SAN, and UCI without data loss or corruption', () => {
        const rawPgn = `[Event "Integration Test Game"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 *`;

        const parsed = parsePGN(rawPgn);
        let state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

        const uciMoves: string[] = [];
        const reconstructedSan: string[] = [];

        for (const sanMove of parsed.moves) {
            // 1. SAN -> Generic Move Validation (parseSAN verifies generation)
            const internalMove = parseSAN(state, sanMove);

            // 2. Generic Move -> UCI string
            const uciString = moveToUci(internalMove);
            uciMoves.push(uciString);

            // 3. UCI string reverse lookup -> Generic Move (verified again)
            const uciResolvedMove = uciToMove(state, uciString);
            expect(uciResolvedMove).toEqual(internalMove);

            // 4. Verify original SAN regeneration matches parsed SAN
            const regeneratedSan = moveToSAN(state, uciResolvedMove, generateLegalMoves(state));
            reconstructedSan.push(regeneratedSan);
            expect(regeneratedSan).toBe(sanMove);

            // Proceed state cleanly
            state = applyMove(state, uciResolvedMove);
        }

        // Final consistency check
        expect(reconstructedSan).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4']);

        // Final export check
        const newPgn = stringifyPGN(parsed.headers, reconstructedSan, "*");
        const reparsed = parsePGN(newPgn);
        expect(reparsed.moves).toEqual(parsed.moves);
    });

    it('Should aggressively throw on bad corrupted inputs', () => {
        const state = parseFEN('k7/8/8/8/8/8/8/K7 w - - 0 1');
        expect(() => parseSAN(state, "invalidMove")).toThrow();
        expect(() => uciToMove(state, "e9e5")).toThrow();
        expect(() => uciToMove(state, "a1h8")).toThrow();
    });

    it('Should process long stress PGN sequences safely without cascading state corruption', () => {
        // Simulate a long pseudo-legal looping maneuver without crashing
        let state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        const moves = [
            'Nf3', 'Nf6', 'Ng1', 'Ng8',
            'Nf3', 'Nf6', 'Ng1', 'Ng8',
            'Nf3', 'Nf6', 'Ng1', 'Ng8',
            'Nf3', 'Nf6', 'Ng1', 'Ng8',
            'Nf3', 'Nf6', 'Ng1', 'Ng8'
        ];
        
        for (const san of moves) {
            const move = parseSAN(state, san);
            state = applyMove(state, move);
        }
        
        // Assert correct incrementing sequence for repetition loops avoiding 50-move trigger yet
        expect(state.halfMoveClock).toBe(20); 
    });

});
