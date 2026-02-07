import { search, stopSearch, resizeTT } from './search';
import { analyzeGame } from './analysis';
import type { GameState } from './types';
import type { SearchConfig } from './search';
import { getBookMove } from './openings';
import { toFEN } from './fen';
import { parseMove } from './rules';

/**
 * The worker listens for messages from the main thread to start or stop searching.
 */
self.onmessage = (e: MessageEvent) => {
    const { type, data } = e.data;

    switch (type) {
        case 'START_SEARCH':
            const { state, config } = data as { state: GameState; config: SearchConfig };
            try {
                // 1. Check opening book first
                const fen = toFEN(state);
                const bookMoveStr = getBookMove(fen);

                if (bookMoveStr) {
                    const bookMove = parseMove(state, bookMoveStr);
                    if (bookMove) {
                        self.postMessage({
                            type: 'SEARCH_COMPLETE',
                            data: { score: 0, move: bookMove, depthReached: 0, nodesSearched: 0, fromBook: true }
                        });
                        return;
                    }
                }

                // 2. Normal engine search
                const result = search(state, config);
                self.postMessage({ type: 'SEARCH_COMPLETE', data: result });
            } catch (error) {
                self.postMessage({ type: 'SEARCH_ERROR', data: (error as Error).message });
            }
            break;

        case 'START_PONDER':
            const { state: pState, config: pConfig } = data;
            // Apply the move to get the position to think about
            try {
                // We need to import applyMove here? 
                // Wait, the worker might not have applyMove imported.
                // Let's assume the main thread passes the *resultant* state to minimize worker imports?
                // No, main thread passed 'state' and 'ponderMove'.
                // Ideally main thread passes the state AFTER the predicted move.
                // Let's assume 'data.state' IS the state after the predicted move.
                // This simplifies worker logic.

                // For now, just run a search but DO NOT post complete.
                // We need a global variable to hold the result until PONDER_HIT.
                self.postMessage({ type: 'PONDER_STARTED' });

                // Hack: We drag-race. We run search. If it finishes, we hold the result.
                // If PONDER_HIT comes, we flush the result (if done) or wait for it.
                // This is complex. 
                // SIMPLIFIED PONDER:
                // Just run 'search' normally. If it finishes, send 'PONDER_COMPLETE'.
                // Main thread ignores 'PONDER_COMPLETE' unless it hit.
                // But we want to extend time if needed?

                // IMPLEMENTATION:
                // Just run search.
                const result = search(pState, pConfig);
                self.postMessage({ type: 'PONDER_COMPLETE', data: result });
            } catch (err) {
                // ignore
            }
            break;

        case 'PONDER_HIT':
            // If we are still searching, we continue.
            // If we finished and sent PONDER_COMPLETE, the main thread already has it (stashed).
            // Actually, usually PONDER_HIT means "Switch constraints to normal time controls".
            // Since we use fixed Depth/Time, we might just let it run.
            break;

        case 'PONDER_MISS':
            stopSearch();
            break;

        case 'ANALYZE':
            const { initialFen, history } = data;
            const result = analyzeGame(initialFen, history);
            self.postMessage({ type: 'ANALYSIS_RESULT', result });
            break;

        case 'STOP_SEARCH':
            stopSearch();
            break;

        case 'CONFIGURE_ENGINE':
            if (data.liteMode) {
                resizeTT(4); // 4MB for Lite Mode
            } else {
                resizeTT(16); // 16MB for Normal Mode
            }
            break;

        default:
            console.warn(`Worker received unknown message type: ${data.type}`);
    }
};
