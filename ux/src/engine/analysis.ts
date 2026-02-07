import type { Move } from './types';
import { search } from './search';
import { applyMove } from './board';
import { parseFEN } from './fen';

export interface MoveAnalysis {
    moveIndex: number; // 0-based index in history
    playedMove: Move;
    bestMove: Move | null;
    scoreDiff: number; // Difference between best move score and played move score (in centipawns)
    classification: 'Brilliant' | 'Best' | 'Excellent' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder' | 'Book';
    engineScore: number;
}

export interface GameAnalysisResult {
    accuracy: number; // 0-100
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

// Configuration for analysis
const ANALYSIS_CONFIG = {
    depth: 10, // Fast but decent depth for analysis
    riskFactor: 0
};

export function analyzeGame(initialFen: string, history: { move: Move, san: string }[]): GameAnalysisResult {
    let currentState = parseFEN(initialFen);
    const details: MoveAnalysis[] = [];
    const summary = { brilliant: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    let totalAccuracyPoints = 0;
    let countedMoves = 0;

    for (let i = 0; i < history.length; i++) {
        const historyItem = history[i];

        // We only analyze the HUMAN's moves (assuming user played White or we analyze both?)
        // Let's analyze BOTH sides for a full report, but usually users care about THEIR moves.
        // For simplicity, let's analyze all moves to show the flow.

        // 1. Find Best Move in current position
        const bestResult = search(currentState, { maxDepth: ANALYSIS_CONFIG.depth });
        const bestScore = bestResult.score;

        // 2. Evaluate Played Move
        // To get the score of the played move, we apply it, then search from opponent's perspective and negate.
        // BUT, searching a specific move is tricky with our current `search` interface.
        // EASIER: If playedMove == bestMove, score is bestScore.
        // If not, we run a search on the position *after* the played move.
        // The score of the position after played move (from opponent side) is X.
        // So score of played move is -X.

        let playedScore = bestScore;
        const playedMove = historyItem.move;

        const isBestMove = bestResult.move &&
            bestResult.move.from.rank === playedMove.from.rank &&
            bestResult.move.from.file === playedMove.from.file &&
            bestResult.move.to.rank === playedMove.to.rank &&
            bestResult.move.to.file === playedMove.to.file;

        if (!isBestMove) {
            // Evaluated the position resulting from the played move
            const nextState = applyMove(currentState, playedMove);
            // Search from opponent perspective
            const result = search(nextState, { maxDepth: ANALYSIS_CONFIG.depth });
            playedScore = -result.score;
        }

        // 3. Calculate Diff (Centipawns)
        // Capped at reasonable values to prevent mates from skewing everything
        const cappedBest = Math.max(-1000, Math.min(1000, bestScore));
        const cappedPlayed = Math.max(-1000, Math.min(1000, playedScore));
        const diff = cappedBest - cappedPlayed;

        // 4. Classify
        let classification: MoveAnalysis['classification'] = 'Good';

        if (diff <= 5) classification = 'Best';
        else if (diff <= 20) classification = 'Excellent';
        else if (diff <= 50) classification = 'Good';
        else if (diff <= 100) classification = 'Inaccuracy';
        else if (diff <= 300) classification = 'Mistake';
        else classification = 'Blunder';

        // Detect "Brilliant" (Heuristic: massive swing or sacrifice? Hard to detect cheaply)
        // For now, if it matches best move and is a sacrifice, maybe? 
        // Let's stick to standard diffs.

        // Update stats
        if (classification === 'Best') summary.best++;
        else if (classification === 'Excellent' || classification === 'Good') summary.good++;
        else if (classification === 'Inaccuracy') summary.inaccuracy++;
        else if (classification === 'Mistake') summary.mistake++;
        else if (classification === 'Blunder') summary.blunder++;

        // Accuracy Calculation (CAPS-like)
        // 100 - (diff / ~constant)
        // Simple formula: Math.max(0, 100 - (diff / 5))
        const moveAcc = Math.max(0, 100 - (diff / 3));
        totalAccuracyPoints += moveAcc;
        countedMoves++;

        details.push({
            moveIndex: i,
            playedMove: playedMove,
            bestMove: bestResult.move,
            scoreDiff: diff,
            classification,
            engineScore: playedScore
        });

        // Advance state
        currentState = applyMove(currentState, playedMove);
    }

    const accuracy = countedMoves > 0 ? totalAccuracyPoints / countedMoves : 0;

    return {
        accuracy,
        details,
        summary
    };
}
