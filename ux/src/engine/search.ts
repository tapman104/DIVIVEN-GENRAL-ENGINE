import type { GameState, Move } from './types';
import { generateLegalMoves, isCheck } from './rules';
import { applyMove } from './board';
import { evaluate } from './eval';
import { orderMoves } from './ordering';
import { generateZobristKey } from './zobrist';
import { TranspositionTable, NodeType } from './tt';

export interface SearchResult {
    score: number;
    move: Move | null;
    depthReached: number;
    nodesSearched: number;
}

export interface SearchConfig {
    maxTimeMs?: number;
    maxDepth?: number;
    riskFactor?: number;
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
    nodesSearched = 0;
    shouldStop = false;

    const maxTime = config.maxTimeMs || Infinity;

    // Performance decision: If time is extremely low, use policy-first mode
    if (maxTime < 50) {
        return searchLimited(state, config);
    }

    let bestResult: SearchResult = { score: 0, move: null, depthReached: 0, nodesSearched: 0 };
    const startTime = Date.now();
    const maxDepth = config.maxDepth || 24;

    // Iterative Deepening
    for (let d = 1; d <= maxDepth; d++) {
        const result = negamax(state, d, -Infinity, Infinity, state.turn === 'w' ? 1 : -1, config.riskFactor || 0);

        if (shouldStop) break;

        bestResult = { ...result, depthReached: d, nodesSearched };

        const elapsed = Date.now() - startTime;
        if (elapsed > maxTime * 0.9) break;
    }

    return bestResult;
}

/**
 * ULTRA-MOBILE POLICY ENGINE
 * Strength per millisecond.
 */
function searchLimited(state: GameState, _config: SearchConfig): SearchResult {
    const moves = generateLegalMoves(state);
    if (moves.length === 0) {
        return { score: isCheck(state, state.turn) ? -MATE_SCORE : 0, move: null, depthReached: 0, nodesSearched: 0 };
    }

    let bestMove: Move | null = null;
    let bestScore = -Infinity;
    const color = state.turn === 'w' ? 1 : -1;

    // 1. Policy Evaluation over all legal moves
    for (const move of moves) {
        const nextState = applyMove(state, move);

        // IMMEDIATE WIN: If this move is mate, play it!
        if (isCheck(nextState, nextState.turn)) {
            const escapeMoves = generateLegalMoves(nextState);
            if (escapeMoves.length === 0) {
                return { score: MATE_SCORE, move: move, depthReached: 1, nodesSearched: nodesSearched + 1 };
            }
        }

        const score = color * evaluate(nextState, _config.riskFactor || 0);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        nodesSearched++;
    }

    // 2. Threat Filter
    const threatDetected = isCheck(state, state.turn) || moves.some(m => m.isCapture);

    // 3. Conditional Micro-Search (2-ply)
    if (threatDetected && bestMove) {
        // Run a small 2-ply search on the top move only to verify safety
        // To keep it under 10ms, we only search the top move's responses
        const nextState = applyMove(state, bestMove);
        const responses = generateLegalMoves(nextState);

        if (responses.length > 0) {
            let worstResponseScore = Infinity;
            for (const resp of responses) {
                const afterResp = applyMove(nextState, resp);
                const score = color * evaluate(afterResp, _config.riskFactor || 0);
                if (score < worstResponseScore) worstResponseScore = score;
                nodesSearched++;

                if (nodesSearched > 300) break; // Hard node cap
            }
            bestScore = worstResponseScore;
        }
    }

    return { score: bestScore, move: bestMove, depthReached: 2, nodesSearched };
}

function negamax(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    color: number,
    riskFactor: number = 0
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
        const result = negamax(nextState, depth - 1, -beta, -alpha, -color, riskFactor);
        const score = -result.score;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }

        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
    }

    // 3. TT Store
    let type: NodeType = NodeType.EXACT;
    if (bestScore <= originalAlpha) type = NodeType.UPPER_BOUND;
    else if (bestScore >= beta) type = NodeType.LOWER_BOUND;

    tt.store(key, depth, bestScore, type, bestMove);

    return { score: bestScore, move: bestMove, depthReached: depth, nodesSearched };
}

function quiescence(state: GameState, alpha: number, beta: number, color: number, riskFactor: number = 0): number {
    nodesSearched++;
    const standPat = color * evaluate(state, riskFactor);

    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    // Only search captures in quiescence
    let moves = generateLegalMoves(state).filter(m => m.isCapture);
    moves = orderMoves(state, moves);

    for (const move of moves) {
        const nextState = applyMove(state, move);
        const score = -quiescence(nextState, -beta, -alpha, -color, riskFactor);

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }

    return alpha;
}
