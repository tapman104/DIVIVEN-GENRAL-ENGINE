import { search, stopSearch, SearchConfig } from './search';
import { GameState } from './types';
import { getBookMove } from './openings';
import { toFEN } from './board';
import { parseMove } from './movegen'; // Assuming we need this to convert string to Move

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

        case 'STOP_SEARCH':
            stopSearch();
            break;

        default:
            console.warn(`Worker received unknown message type: ${type}`);
    }
};
