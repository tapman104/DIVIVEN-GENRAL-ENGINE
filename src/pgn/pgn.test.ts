import { describe, it, expect } from 'vitest';
import { parsePGN as pgnParser } from './parse.js';
import { stringifyPGN as pgnStringer, Result } from './stringify.js';

describe('PGN format support', () => {

    it('Should fully strip comments and variations', () => {
        const rawPgn = `[Event "FIDE World Cup 2017"]
[Result "1/2-1/2"]

1. e4 {Best by test} e5 2. Nf3 (2. f4 d5) 2... Nc6 1/2-1/2`;

        const parsed = pgnParser(rawPgn);
        expect(parsed.headers['Event']).toBe('FIDE World Cup 2017');
        expect(parsed.headers['Result']).toBe('1/2-1/2');
        expect(parsed.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    });

    it('Should roundtrip stringify and parse accurately', () => {
        const headers = { Event: "Test", White: "Player A", Black: "Player B" };
        const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6'];
        const result: Result = "1-0";

        const pgnString = pgnStringer(headers, moves, result);
        const parsed = pgnParser(pgnString);

        expect(parsed.headers).toEqual(headers);
        expect(parsed.moves).toEqual(moves);
    });

});
