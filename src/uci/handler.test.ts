import { describe, it, expect, vi } from 'vitest';
import { UCIHandler } from './handler.js';

describe('UCI Protocol Handler', () => {

    it('Should handle initialization and readiness', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const handler = new UCIHandler();

        handler.handleCommand('uci');
        expect(logSpy).toHaveBeenCalledWith('id name DIVIVEN');
        expect(logSpy).toHaveBeenCalledWith('uciok');

        handler.handleCommand('isready');
        expect(logSpy).toHaveBeenCalledWith('readyok');

        logSpy.mockRestore();
    });

    it('Should correctly simulate a starting interaction loop', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const handler = new UCIHandler();

        handler.handleCommand('ucinewgame');
        handler.handleCommand('position startpos moves e2e4 e7e5');
        
        // State should be updated, if we had access to state we could check it
        // Instead we can launch a tiny go command and see it respond
        handler.handleCommand('go depth 1');
        
        // Wait for next tick so synchronous search can finish
        return new Promise<void>(resolve => {
            setImmediate(() => {
                expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('bestmove'));
                logSpy.mockRestore();
                resolve();
            });
        });
    });

    it('Should accept a stop command without crashing', () => {
        const handler = new UCIHandler();
        handler.handleCommand('position startpos');
        handler.handleCommand('go depth 2');
        expect(() => handler.handleCommand('stop')).not.toThrow();
    });

});
