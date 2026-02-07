"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopSearch = stopSearch;
exports.search = search;
const rules_1 = require("./rules");
const board_1 = require("./board");
const eval_1 = require("./eval");
const ordering_1 = require("./ordering");
const zobrist_1 = require("./zobrist");
const tt_1 = require("./tt");
const book_1 = require("./book");
// Global TT for now (could be passed in)
const tt = new tt_1.TranspositionTable(16); // 16MB table
let nodesSearched = 0;
const MATE_SCORE = 100000;
// Search controller for cancellation
let shouldStop = false;
function stopSearch() {
    shouldStop = true;
}
function search(state, config) {
    nodesSearched = 0;
    shouldStop = false;
    const maxTime = config.maxTimeMs || Infinity;
    // 0. Opening Book Lookup
    const fen = (0, board_1.toFEN)(state);
    const bookMoveStr = (0, book_1.getBookMove)(fen);
    if (bookMoveStr) {
        const legalMoves = (0, rules_1.generateLegalMoves)(state);
        const bookMove = legalMoves.find(m => {
            const fromSq = (0, board_1.squareToAlgebraic)(m.from);
            const toSq = (0, board_1.squareToAlgebraic)(m.to);
            return (fromSq === bookMoveStr.slice(0, 2) && toSq === bookMoveStr.slice(2, 4));
        });
        if (bookMove) {
            return { score: 0, move: bookMove, depthReached: 0, nodesSearched: 0, pv: [bookMove] };
        }
    }
    // Performance decision: If time is extremely low, use policy-first mode
    if (maxTime < 20) {
        return searchLimited(state, config);
    }
    let bestResult = { score: 0, move: null, depthReached: 0, nodesSearched: 0, pv: [] };
    const startTime = Date.now();
    const maxDepth = config.maxDepth || 24;
    // Iterative Deepening
    for (let d = 1; d <= maxDepth; d++) {
        const result = negamax(state, d, -Infinity, Infinity, state.turn === 'w' ? 1 : -1, config.riskFactor || 0, maxDepth);
        if (shouldStop)
            break;
        bestResult = { ...result, depthReached: d, nodesSearched, pv: [] };
        const elapsed = Date.now() - startTime;
        if (elapsed > maxTime * 0.9)
            break;
    }
    const pv = getPV(state, bestResult.depthReached);
    return { ...bestResult, pv };
}
/**
 * ULTRA-MOBILE POLICY ENGINE
 * Strength per millisecond.
 */
function searchLimited(state, _config) {
    const moves = (0, rules_1.generateLegalMoves)(state);
    if (moves.length === 0) {
        return { score: (0, rules_1.isCheck)(state, state.turn) ? -MATE_SCORE : 0, move: null, depthReached: 0, nodesSearched: 0, pv: [] };
    }
    let bestMove = null;
    let bestScore = -Infinity;
    const color = state.turn === 'w' ? 1 : -1;
    // 1. Policy Evaluation over all legal moves
    for (const move of moves) {
        const nextState = (0, board_1.applyMove)(state, move);
        // IMMEDIATE WIN: If this move is mate, play it!
        if ((0, rules_1.isCheck)(nextState, nextState.turn)) {
            const escapeMoves = (0, rules_1.generateLegalMoves)(nextState);
            if (escapeMoves.length === 0) {
                return { score: MATE_SCORE, move: move, depthReached: 1, nodesSearched: nodesSearched + 1, pv: [move] };
            }
        }
        const score = color * (0, eval_1.evaluate)(nextState, _config.riskFactor || 0);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        nodesSearched++;
    }
    // 2. Threat Filter
    const threatDetected = (0, rules_1.isCheck)(state, state.turn) || moves.some(m => m.isCapture);
    // 3. Conditional Micro-Search (2-ply)
    if (threatDetected && bestMove) {
        // Run a small 2-ply search on the top move only to verify safety
        // To keep it under 10ms, we only search the top move's responses
        const nextState = (0, board_1.applyMove)(state, bestMove);
        const responses = (0, rules_1.generateLegalMoves)(nextState);
        if (responses.length > 0) {
            let worstResponseScore = Infinity;
            for (const resp of responses) {
                const afterResp = (0, board_1.applyMove)(nextState, resp);
                const score = color * (0, eval_1.evaluate)(afterResp, _config.riskFactor || 0);
                if (score < worstResponseScore)
                    worstResponseScore = score;
                nodesSearched++;
                if (nodesSearched > 300)
                    break; // Hard node cap
            }
            bestScore = worstResponseScore;
        }
    }
    return { score: bestScore, move: bestMove, depthReached: 2, nodesSearched, pv: bestMove ? [bestMove] : [] };
}
function negamax(state, depth, alpha, beta, color, riskFactor = 0, maxDepth = 12) {
    if (shouldStop)
        return { score: 0, move: null, depthReached: depth, nodesSearched, pv: [] };
    nodesSearched++;
    const originalAlpha = alpha;
    const key = (0, zobrist_1.generateZobristKey)(state);
    // 1. TT Lookup
    const ttEntry = tt.lookup(key);
    if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.type === tt_1.NodeType.EXACT)
            return { score: ttEntry.score, move: ttEntry.move, depthReached: depth, nodesSearched, pv: [] };
        if (ttEntry.type === tt_1.NodeType.LOWER_BOUND)
            alpha = Math.max(alpha, ttEntry.score);
        if (ttEntry.type === tt_1.NodeType.UPPER_BOUND)
            beta = Math.min(beta, ttEntry.score);
        if (alpha >= beta)
            return { score: ttEntry.score, move: ttEntry.move, depthReached: depth, nodesSearched, pv: [] };
    }
    // 4. Check Extension - Search deeper if in check
    const inCheck = (0, rules_1.isCheck)(state, state.turn);
    if (inCheck && depth < maxDepth + 2) {
        depth++;
    }
    if (depth <= 0) {
        return { score: quiescence(state, alpha, beta, color), move: null, depthReached: 0, nodesSearched, pv: [] };
    }
    let moves = (0, rules_1.generateLegalMoves)(state);
    if (moves.length === 0) {
        if ((0, rules_1.isCheck)(state, state.turn)) {
            // Checkmate: Returning a score that encourages shorter mates
            return { score: -(MATE_SCORE + depth), move: null, depthReached: depth, nodesSearched, pv: [] };
        }
        else {
            // Stalemate
            return { score: 0, move: null, depthReached: depth, nodesSearched, pv: [] };
        }
    }
    // 2. Move Ordering
    moves = (0, ordering_1.orderMoves)(state, moves);
    let bestScore = -Infinity;
    let bestMove = null;
    for (const move of moves) {
        const nextState = (0, board_1.applyMove)(state, move);
        const result = negamax(nextState, depth - 1, -beta, -alpha, -color, riskFactor, maxDepth);
        const score = -result.score;
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        alpha = Math.max(alpha, score);
        if (alpha >= beta)
            break;
    }
    // 3. TT Store
    let type = tt_1.NodeType.EXACT;
    if (bestScore <= originalAlpha)
        type = tt_1.NodeType.UPPER_BOUND;
    else if (bestScore >= beta)
        type = tt_1.NodeType.LOWER_BOUND;
    tt.store(key, depth, bestScore, type, bestMove);
    return { score: bestScore, move: bestMove, depthReached: depth, nodesSearched, pv: [] };
}
function getPV(state, depth) {
    const pv = [];
    let current = (0, board_1.cloneState)(state);
    const seen = new Set();
    for (let i = 0; i < depth; i++) {
        const key = (0, zobrist_1.generateZobristKey)(current);
        if (seen.has(key))
            break;
        seen.add(key);
        const entry = tt.lookup(key);
        if (!entry || !entry.move)
            break;
        pv.push(entry.move);
        current = (0, board_1.applyMove)(current, entry.move);
    }
    return pv;
}
function quiescence(state, alpha, beta, color, riskFactor = 0) {
    nodesSearched++;
    const standPat = color * (0, eval_1.evaluate)(state, riskFactor);
    if (standPat >= beta)
        return beta;
    if (alpha < standPat)
        alpha = standPat;
    // Only search captures in quiescence
    let moves = (0, rules_1.generateLegalMoves)(state).filter(m => m.isCapture);
    moves = (0, ordering_1.orderMoves)(state, moves);
    for (const move of moves) {
        const nextState = (0, board_1.applyMove)(state, move);
        const score = -quiescence(nextState, -beta, -alpha, -color, riskFactor);
        if (score >= beta)
            return beta;
        if (score > alpha)
            alpha = score;
    }
    return alpha;
}
