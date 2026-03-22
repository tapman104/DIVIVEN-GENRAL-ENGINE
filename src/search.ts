import { GameState, Move } from './types.js';
import { generateLegalMoves, isCheck } from './rules.js';
import { applyMove } from './board.js';
import { evaluate } from './eval.js';
import { clearHeuristics, storeKiller, updateHistory, decayHistory, scoreMove } from './ordering.js';
import { generateZobristKey } from './zobrist.js';
import { TranspositionTable, NodeType } from './tt.js';

export interface SearchResult {
    score: number;
    move: Move | null;
    depthReached: number;
    nodesSearched: number;
}

export interface SearchInfo {
    depth: number;
    scoreCp?: number;
    scoreMate?: number;
    nodes: number;
    time: number;
    pv: Move[];
}

export interface SearchConfig {
    maxTimeMs?: number;
    maxDepth?: number;
    onInfo?: (info: SearchInfo) => void;
}

export function extractPV(state: GameState, depth: number): Move[] {
    const pv: Move[] = [];
    let currState = state;
    for (let i = 0; i < depth; i++) {
        const key = generateZobristKey(currState);
        const entry = tt.lookup(key);
        if (entry && entry.move) {
            pv.push(entry.move);
            try {
                currState = applyMove(currState, entry.move);
            } catch (e) {
                break;
            }
        } else {
            break;
        }
    }
    return pv;
}

// Global TT for now (could be passed in)
export const tt = new TranspositionTable(16); // 16MB table
let nodesSearched = 0;
const MATE_SCORE = 100000;

export class SearchController {
    stopped = false;
    stop() {
        this.stopped = true;
    }
}

// Search controller for cancellation (Fallback/Legacy)
let shouldStop = false;
export function stopSearch() {
    shouldStop = true;
}

export function search(state: GameState, config: SearchConfig, controller?: SearchController): SearchResult {
    let bestResult: SearchResult = { score: 0, move: null, depthReached: 0, nodesSearched: 0 };
    nodesSearched = 0;
    shouldStop = false;

    const startTime = Date.now();
    const maxDepth = config.maxDepth || 24;
    const maxTime = config.maxTimeMs || Infinity;

    // Iterative Deepening
    for (let d = 1; d <= maxDepth; d++) {
        const result = negamax(state, d, -Infinity, Infinity, state.turn === 'w' ? 1 : -1, controller);

        // If we stopped mid-depth (manually or via time), don't trust this result
        if (shouldStop || (controller && controller.stopped)) break;

        bestResult = { ...result, depthReached: d, nodesSearched };

        const elapsed = Date.now() - startTime;

        if (config.onInfo && bestResult.move) {
            let scoreCp: number | undefined = result.score;
            let scoreMate: number | undefined;
            if (Math.abs(result.score) > MATE_SCORE - 1000) {
                const movesToMate = Math.ceil((MATE_SCORE - Math.abs(result.score)) / 2);
                scoreMate = result.score > 0 ? movesToMate : -movesToMate;
                scoreCp = undefined;
            }

            const pv = extractPV(state, Math.min(d, 10)); // extract up to 10 moves
            // Fallback if PV lookup failed
            if (pv.length === 0) pv.push(bestResult.move);

            config.onInfo({
                depth: d,
                scoreCp,
                scoreMate,
                nodes: nodesSearched,
                time: elapsed,
                pv: pv
            });
        }

        // Time check
        if (elapsed > maxTime * 0.9) { // 10% safety margin
            break;
        }
    }

    return bestResult;
}

function hasNonPawnMaterial(state: GameState): boolean {
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const p = state.board[r][f];
            if (p && p.color === state.turn && p.type !== 'p' && p.type !== 'k') {
                return true;
            }
        }
    }
    return false;
}

function negamax(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    color: number,
    controller?: SearchController,
    isNullMove = false
): SearchResult {
    if (shouldStop || (controller && controller.stopped)) return { score: 0, move: null, depthReached: depth, nodesSearched };
    nodesSearched++;
    const originalAlpha = alpha;
    const key = generateZobristKey(state);

    // 1. TT Lookup
    const ttEntry = tt.lookup(key);
    if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.type === NodeType.EXACT) return { score: ttEntry.score, move: ttEntry.move, depthReached: depth, nodesSearched };
        if (ttEntry.type === NodeType.LOWER_BOUND) alpha = Math.max(alpha, ttEntry.score);
        if (ttEntry.type === NodeType.UPPER_BOUND) beta = Math.min(beta, ttEntry.score);

        if (alpha >= beta) return { score: ttEntry.score, move: ttEntry.move, depthReached: depth, nodesSearched };
    }

    const inCheck = isCheck(state, state.turn);

    // Draw Detection (Threefold Repetition & 50-Move Rule)
    if (state.halfMoveClock >= 100) return { score: 0, move: null, depthReached: depth, nodesSearched };
    if (state.history) {
        let count = 0;
        for (const h of state.history) {
            if (h === key) {
                count++;
                if (count >= 2) return { score: 0, move: null, depthReached: depth, nodesSearched };
            }
        }
    }

    // Null Move Pruning
    if (!isNullMove && depth >= 3 && !inCheck && hasNonPawnMaterial(state)) {
        const prevEnPassant = state.enPassantSquare;
        const prevTurn = state.turn;

        // Apply Null Move manually to bypass clones
        state.turn = state.turn === 'w' ? 'b' : 'w';
        state.enPassantSquare = null;

        const R = depth > 6 ? 3 : 2;
        const nullResult = negamax(state, depth - 1 - R, -beta, -beta + 1, -color, controller, true);
        const nullScore = -nullResult.score;

        // Undo Null Move
        state.turn = prevTurn;
        state.enPassantSquare = prevEnPassant;

        if (nullScore >= beta) {
            return { score: beta, move: null, depthReached: depth, nodesSearched };
        }
    }

    if (depth <= 0) {
        return { score: quiescence(state, alpha, beta, color), move: null, depthReached: 0, nodesSearched };
    }

    let moves = generateLegalMoves(state);
    if (moves.length === 0) {
        if (inCheck) {
            // Checkmate: Returning a score that encourages shorter mates
            return { score: -(MATE_SCORE + depth), move: null, depthReached: depth, nodesSearched };
        } else {
            // Stalemate
            return { score: 0, move: null, depthReached: depth, nodesSearched };
        }
    }

    const scores = new Int32Array(moves.length);
    for (let i = 0; i < moves.length; i++) {
        scores[i] = scoreMove(moves[i], depth);
    }

    let bestScore = -Infinity;
    let bestMove: Move | null = null;

    for (let i = 0; i < moves.length; i++) {
        let best = i;
        for (let j = i + 1; j < moves.length; j++) {
            if (scores[j] > scores[best]) {
                best = j;
            }
        }
        
        // Swap selection
        const tempM = moves[i]; moves[i] = moves[best]; moves[best] = tempM;
        const tempS = scores[i]; scores[i] = scores[best]; scores[best] = tempS;
        
        const move = moves[i];

        const nextState = applyMove(state, move);
        const result = negamax(nextState, depth - 1, -beta, -alpha, -color, controller);
        const score = -result.score;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }

        alpha = Math.max(alpha, score);
        if (alpha >= beta) {
            storeKiller(depth, move);
            updateHistory(move, depth);
            break;
        }
    }

    if (nodesSearched % 2048 === 0) {
        decayHistory();
    }

    // 3. TT Store
    let type = NodeType.EXACT;
    if (bestScore <= originalAlpha) type = NodeType.UPPER_BOUND;
    else if (bestScore >= beta) type = NodeType.LOWER_BOUND;

    tt.store(key, depth, bestScore, type, bestMove);

    return { score: bestScore, move: bestMove, depthReached: depth, nodesSearched };
}

function quiescence(state: GameState, alpha: number, beta: number, color: number): number {
    nodesSearched++;
    const standPat = color * evaluate(state);

    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    // Only search captures in quiescence
    let moves = generateLegalMoves(state).filter(m => m.isCapture);
    const scores = new Int32Array(moves.length);
    for (let i = 0; i < moves.length; i++) {
        scores[i] = scoreMove(moves[i], 0);
    }

    for (let i = 0; i < moves.length; i++) {
        let best = i;
        for (let j = i + 1; j < moves.length; j++) {
            if (scores[j] > scores[best]) {
                best = j;
            }
        }
        const tempM = moves[i]; moves[i] = moves[best]; moves[best] = tempM;
        const tempS = scores[i]; scores[i] = scores[best]; scores[best] = tempS;
        
        const move = moves[i];

        const nextState = applyMove(state, move);
        const score = -quiescence(nextState, -beta, -alpha, -color);

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }

    return alpha;
}
