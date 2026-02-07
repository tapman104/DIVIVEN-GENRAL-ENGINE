import type { GameState, Move } from './types';
import type { SearchResult, SearchConfig } from './search';

export interface MoveAnalysis {
    moveIndex: number;
    playedMove: Move;
    bestMove: Move | null;
    scoreDiff: number;
    classification: 'Brilliant' | 'Best' | 'Excellent' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder' | 'Book';
    engineScore: number;
}

export interface GameAnalysisResult {
    accuracy: number;
    details: MoveAnalysis[];
    summary: {
        brilliant: number;
        best: number;
        good: number;
        inaccuracy: number;
        mistake: number;
        blunder: number;
    };
}

export class ChessEngineBridge {
    private worker: Worker | null = null;
    private currentResolve: ((result: SearchResult) => void) | null = null;
    private currentReject: ((reason: any) => void) | null = null;
    public pendingPonderMove: any = null;

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
     * Starts a background ponder search.
     * The engine thinks about what to do IF the opponent plays `ponderMove`.
     */
    public startPonder(state: GameState, lastMove: Move | null, config: SearchConfig) {
        if (!this.worker) return;
        this.pendingPonderMove = null;
        this.worker.postMessage({ type: 'ponder', state, lastMove, config });
    }

    /**
     * The opponent played the move we were pondering!
     * Convert the ponder search into a real search and return the promise.
     */
    public ponderHit(): Promise<SearchResult> {
        if (!this.worker) return Promise.reject('Worker not initialized');

        // Reuse existing promise logic or create new?
        // Ideally the worker just sends 'SEARCH_COMPLETE' when done.
        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;
            this.currentReject = reject;
            this.worker?.postMessage({ type: 'PONDER_HIT' });
        });
    }

    /**
     * The opponent played something else. 
     * Stop the ponder and get ready for a new search.
     */
    public ponderMiss() {
        this.worker?.postMessage({ type: 'STOP_SEARCH' });
        this.clearCurrentPromise();
    }

    /**
     * Signals the engine to stop searching as soon as possible.
     */
    public cancelSearch() {
        this.worker?.postMessage({ type: 'STOP_SEARCH' });
    }

    public configureEngine(config: { liteMode: boolean }) {
        this.worker?.postMessage({ type: 'CONFIGURE_ENGINE', data: config });
    }

    public analyzeGame(initialFen: string, history: any[]): Promise<any> {
        if (!this.worker) return Promise.reject('Worker not initialized');
        return new Promise((resolve) => {
            const listener = (e: MessageEvent) => {
                const { type, result } = e.data;
                if (type === 'ANALYSIS_RESULT') {
                    this.worker?.removeEventListener('message', listener);
                    // We also need to re-attach the main listener if we removed it?
                    // Actually, we added a specific listener.
                    // But wait, the main listener generic `onmessage` handles everything.
                    // If we add another listener, both will fire.
                    // The main listener logs warning for unknown types.
                    // So we should handle 'ANALYSIS_RESULT' in main listener or use a separate channel.
                    // Let's rely on main listener to IGNORE it (it warns unknown type), and this one to catch it.
                    resolve(result);
                }
            };
            this.worker?.addEventListener('message', listener);
            this.worker?.postMessage({ type: 'ANALYZE', initialFen, history });
        });
    }

    /**
     * Terminates the worker thread.
     */
    public terminate() {
        this.worker?.terminate();
        this.worker = null;
    }
}
