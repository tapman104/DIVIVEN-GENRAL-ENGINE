import type { GameState } from './types';
import type { SearchResult, SearchConfig } from './search';

export class ChessEngineBridge {
    private worker: Worker | null = null;
    private currentResolve: ((result: SearchResult) => void) | null = null;
    private currentReject: ((reason: any) => void) | null = null;

    constructor() {
        try {
            this.worker = new Worker(new URL('./chess.worker.ts', import.meta.url), {
                type: 'module'
            });
            this.worker.onmessage = this.handleMessage.bind(this);
            this.worker.onerror = (e) => {
                if (this.currentReject) {
                    this.currentReject(e);
                    this.clearCurrentPromise();
                }
            };
        } catch (error) {
            console.error('Failed to initialize Chess Engine Worker:', error);
        }
    }

    private handleMessage(e: MessageEvent) {
        const { type, data } = e.data;

        switch (type) {
            case 'SEARCH_COMPLETE':
                if (this.currentResolve) {
                    this.currentResolve(data as SearchResult);
                }
                this.clearCurrentPromise();
                break;
            case 'SEARCH_ERROR':
                if (this.currentReject) {
                    this.currentReject(new Error(data as string));
                }
                this.clearCurrentPromise();
                break;
        }
    }

    private clearCurrentPromise() {
        this.currentResolve = null;
        this.currentReject = null;
    }

    /**
     * Finds the best move for the given game state asynchronously using the worker.
     */
    public findBestMove(state: GameState, config: SearchConfig): Promise<SearchResult> {
        if (!this.worker) return Promise.reject('Worker not initialized');

        if (this.currentResolve) {
            this.cancelSearch();
        }

        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;
            this.currentReject = reject;
            this.worker?.postMessage({
                type: 'START_SEARCH',
                data: { state, config }
            });
        });
    }

    /**
     * Signals the engine to stop searching as soon as possible.
     */
    public cancelSearch() {
        this.worker?.postMessage({ type: 'STOP_SEARCH' });
    }

    /**
     * Terminates the worker thread.
     */
    public terminate() {
        this.worker?.terminate();
        this.worker = null;
    }
}
