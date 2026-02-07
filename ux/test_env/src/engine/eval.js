"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = evaluate;
const rules_1 = require("./rules");
const MATERIAL_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
};
// Flat PSTs for speed (index = rank * 8 + file)
const PAWN_PST = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0
];
const KNIGHT_PST = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
];
const BISHOP_PST = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
];
const ROOK_PST = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0
];
const QUEEN_PST = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20
];
const KING_PST = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20
];
const PST = {
    p: PAWN_PST,
    n: KNIGHT_PST,
    b: BISHOP_PST,
    r: ROOK_PST,
    q: QUEEN_PST,
    k: KING_PST
};
function evaluate(state, riskFactor = 0) {
    let score = 0;
    const { board } = state;
    const whiteKingPos = (0, rules_1.findKing)(state, 'w');
    const blackKingPos = (0, rules_1.findKing)(state, 'b');
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (!piece)
                continue;
            const materialValue = MATERIAL_VALUES[piece.type];
            // 1. PST
            const table = PST[piece.type];
            const pstIdx = piece.color === 'w' ? (r * 8 + f) : ((7 - r) * 8 + f);
            const pstValue = table[pstIdx];
            let pieceScore = materialValue + pstValue;
            // REMOVED isPieceHanging check for speed. 
            // Quiescence search handles tactical captures much better than static analysis.
            // 2. Smart-Speed Heuristics (Aggression)
            const square = { rank: r, file: f };
            // King Attack Weight (Reward pieces near enemy king)
            const enemyKingPos = piece.color === 'w' ? blackKingPos : whiteKingPos;
            const distToKing = Math.max(Math.abs(r - enemyKingPos.rank), Math.abs(f - enemyKingPos.file));
            if (distToKing <= 2 && piece.type !== 'k') {
                pieceScore += (3 - distToKing) * 15; // Bonus for proximity to enemy king
            }
            // Central Mobility (d4, e4, d5, e5)
            if (r >= 3 && r <= 4 && f >= 3 && f <= 4) {
                pieceScore += 10;
            }
            // Passed Pawn Detection (Simplified)
            if (piece.type === 'p') {
                if (isPassedPawn(state, square, piece.color)) {
                    pieceScore += (piece.color === 'w' ? (7 - r) : r) * 20;
                }
                // Pawn Chain (Protected by another pawn)
                if (isPawnProtected(state, square, piece.color)) {
                    pieceScore += 5;
                }
            }
            score += piece.color === 'w' ? pieceScore : -pieceScore;
        }
    }
    // 4. AdaptX Risk Factor (Add high-variance noise if the engine is in "Risk Mode")
    if (riskFactor > 0.1) {
        // Subtle randomization to emulate "human mistakes" or sharp, risky play
        const noise = (Math.random() - 0.5) * 100 * riskFactor;
        score += noise;
    }
    // 5. Endgame Mop-up (K+Q vs K, etc)
    // If we have winning material (no enemy pawns, material > 500), push enemy king to edge.
    const enemyMaterial = state.board.flat().filter(p => p && p.color !== state.turn && p.type !== 'k').length;
    // Simple check: if enemy has no pieces (only king? or very few), and we have major advantage:
    if (enemyMaterial === 0 && Math.abs(score) > 500) {
        const winningColor = score > 0 ? 'w' : 'b';
        const losingKingPos = winningColor === 'w' ? blackKingPos : whiteKingPos;
        const winningKingPos = winningColor === 'w' ? whiteKingPos : blackKingPos;
        // Force King to edge
        const centerDist = Math.max(3 - losingKingPos.rank, losingKingPos.rank - 4) + Math.max(3 - losingKingPos.file, losingKingPos.file - 4);
        const distBetweenKings = Math.abs(winningKingPos.rank - losingKingPos.rank) + Math.abs(winningKingPos.file - losingKingPos.file);
        // Bonus for pushing to edge + Bonus for close kings (helper)
        const mopUpScore = (centerDist * 10) + (14 - distBetweenKings) * 5;
        score += (score > 0 ? mopUpScore : -mopUpScore);
    }
    return score;
}
// function isPieceHanging(state: GameState, r: number, f: number, piece: Piece): boolean {
//     const square = { rank: r, file: f };
//     const opponentColor = piece.color === 'w' ? 'b' : 'w';
//     if (!isSquareAttacked(state, square, opponentColor)) return false;
//     if (!isSquareAttacked(state, square, piece.color)) return true;
//     return false;
// }
function isPassedPawn(state, square, color) {
    const direction = color === 'w' ? -1 : 1;
    const opponentColor = color === 'w' ? 'b' : 'w';
    // Check ranks ahead on the same file and adjacent files
    for (let r = square.rank + direction; r >= 0 && r < 8; r += direction) {
        for (let f = square.file - 1; f <= square.file + 1; f++) {
            if (f < 0 || f > 7)
                continue;
            const piece = state.board[r][f];
            if (piece && piece.type === 'p' && piece.color === opponentColor) {
                return false;
            }
        }
    }
    return true;
}
function isPawnProtected(state, square, color) {
    const protectDir = color === 'w' ? 1 : -1; // Pawns protect diagonals behind them relative to their move dir
    const attackerRank = square.rank + protectDir;
    if (attackerRank < 0 || attackerRank > 7)
        return false;
    const files = [square.file - 1, square.file + 1];
    for (const f of files) {
        if (f < 0 || f > 7)
            continue;
        const p = state.board[attackerRank][f];
        if (p && p.type === 'p' && p.color === color)
            return true;
    }
    return false;
}
