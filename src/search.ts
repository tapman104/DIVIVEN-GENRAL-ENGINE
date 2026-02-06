import { GameState, Move } from './types.js';
import { generateLegalMoves, isCheck } from './rules.js';
import { applyMove } from './board.js';
import { evaluate } from './eval.js';
import { orderMoves } from './ordering.js';
import { generateZobristKey } from './zobrist.js';
import { TranspositionTable, NodeType } from './tt.js';

export interface SearchResult {
    score: number;
    move: Move | null;
    depthReached: number;
    nodesSearched: number;
}

export interface SearchConfig {
    maxTimeMs?: number;
    maxDepth?: number;
}

// Global TT for now (could be passed in)
const tt = new TranspositionTable(16); // 16MB table
let nodesSearched = 0;
const MATE_SCORE = 100000;

// Search controller for cancellation
let shouldStop = false;
export function stopSearch() {
    shouldStop = true;
}

export function search(state: GameState, config: SearchConfig): SearchResult {
    let bestResult: SearchResult = { score: 0, move: null, depthReached: 0, nodesSearched: 0 };
    nodesSearched = 0;
    shouldStop = false;

    const startTime = Date.now();
    const maxDepth = config.maxDepth || 24;
    const maxTime = config.maxTimeMs || Infinity;

    // Iterative Deepening
    for (let d = 1; d <= maxDepth; d++) {
        const result = negamax(state, d, -Infinity, Infinity, state.turn === 'w' ? 1 : -1);

        // If we stopped mid-depth (manually or via time), don't trust this result
        if (shouldStop) break;

        bestResult = { ...result, depthReached: d, nodesSearched };

        // Time check
        const elapsed = Date.now() - startTime;
        if (elapsed > maxTime * 0.9) { // 10% safety margin
            console.log(`Time limit reached at depth ${d}. Elapsed: ${elapsed}ms`);
            break;
        }

        console.log(`Depth ${d} complete. Score: ${result.score}, Nodes: ${nodesSearched}`);
    }

    return bestResult;
}

function negamax(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    color: number
): SearchResult {
    if (shouldStop) return { score: 0, move: null, depthReached: depth, nodesSearched };
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

    if (depth === 0) {
        return { score: quiescence(state, alpha, beta, color), move: null, depthReached: 0, nodesSearched };
    }

    let moves = generateLegalMoves(state);
    if (moves.length === 0) {
        if (isCheck(state, state.turn)) {
            // Checkmate: Returning a score that encourages shorter mates
            return { score: -(MATE_SCORE + depth), move: null, depthReached: depth, nodesSearched };
        } else {
            // Stalemate
            return { score: 0, move: null, depthReached: depth, nodesSearched };
        }
    }

    // 2. Move Ordering
    moves = orderMoves(state, moves);

    let bestScore = -Infinity;
    let bestMove: Move | null = null;

    for (const move of moves) {
        const nextState = applyMove(state, move);
        const result = negamax(nextState, depth - 1, -beta, -alpha, -color);
        const score = -result.score;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }

        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
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
    moves = orderMoves(state, moves);

    for (const move of moves) {
        const nextState = applyMove(state, move);
        const score = -quiescence(nextState, -beta, -alpha, -color);

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }

    return alpha;
}
