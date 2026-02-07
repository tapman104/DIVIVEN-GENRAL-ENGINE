import type { GameState, PieceType, Color, Square } from './types';
import { findKing } from './rules';

const MATERIAL_VALUES: Record<PieceType, number> = {
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

const MG_PST: Record<PieceType, number[]> = {
    p: PAWN_PST,
    n: KNIGHT_PST,
    b: BISHOP_PST,
    r: ROOK_PST,
    q: QUEEN_PST,
    k: KING_PST
};

// Endgame PSTs
const EG_KING_PST = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50
];

const EG_PAWN_PST = [
    0, 0, 0, 0, 0, 0, 0, 0,
    100, 100, 100, 100, 100, 100, 100, 100, // Very strong near promotion
    50, 50, 50, 50, 50, 50, 50, 50,
    20, 20, 20, 20, 20, 20, 20, 20,
    10, 10, 10, 10, 10, 10, 10, 10,
    5, 5, 5, 5, 5, 5, 5, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0
];

const EG_PST: Record<PieceType, number[]> = {
    p: EG_PAWN_PST,
    n: KNIGHT_PST,
    b: BISHOP_PST,
    r: ROOK_PST,
    q: QUEEN_PST,
    k: EG_KING_PST
};

const PHASE_WEIGHTS: Record<PieceType, number> = {
    p: 0,
    n: 1,
    b: 1,
    r: 2,
    q: 4,
    k: 0
};

export function evaluate(state: GameState, riskFactor: number = 0): number {
    let mgScore = 0;
    let egScore = 0;
    let totalPhase = 0;
    const { board } = state;

    const whiteKingPos = findKing(state, 'w');
    const blackKingPos = findKing(state, 'b');

    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (!piece) continue;

            const materialValue = MATERIAL_VALUES[piece.type];
            totalPhase += PHASE_WEIGHTS[piece.type];

            // 1. PST Interpolation
            const mgIdx = piece.color === 'w' ? (r * 8 + f) : ((7 - r) * 8 + f);
            const mgPstValue = MG_PST[piece.type][mgIdx];
            const egPstValue = EG_PST[piece.type][mgIdx];

            let mgPieceScore = materialValue + mgPstValue;
            let egPieceScore = materialValue + egPstValue;

            // 2. Proximity and Mobility
            const enemyKingPos = piece.color === 'w' ? blackKingPos : whiteKingPos;
            const distToKing = Math.max(Math.abs(r - enemyKingPos.rank), Math.abs(f - enemyKingPos.file));

            if (piece.type !== 'k') {
                if (distToKing <= 2) {
                    const bonus = (3 - distToKing) * 15;
                    mgPieceScore += bonus;
                    egPieceScore += bonus * 0.5; // Less aggression in endgame mop-up
                }
            }

            // Centrality
            if (r >= 3 && r <= 4 && f >= 3 && f <= 4) {
                mgPieceScore += 10;
                // No extra centality for non-king pieces in EG beyond PST
            }

            // 3. Pawn Logic
            const square = { rank: r, file: f };
            if (piece.type === 'p') {
                if (isPassedPawn(state, square, piece.color)) {
                    const rankBonus = (piece.color === 'w' ? (7 - r) : r) * 20;
                    mgPieceScore += rankBonus;
                    egPieceScore += rankBonus * 2.5; // Massive pass-pawn weight in EG
                }
                if (isPawnProtected(state, square, piece.color)) {
                    mgPieceScore += 5;
                    egPieceScore += 10;
                }
            }

            if (piece.color === 'w') {
                mgScore += mgPieceScore;
                egScore += egPieceScore;
            } else {
                mgScore -= mgPieceScore;
                egScore -= egPieceScore;
            }
        }
    }

    // 4. AdaptX Risk Factor
    if (riskFactor > 0.1) {
        const noise = (Math.random() - 0.5) * 100 * riskFactor;
        mgScore += noise;
        egScore += noise;
    }

    // 5. Tapering
    // phase goes from 0 (Endgame) to 24 (Initial)
    // We cap it for safety
    const cappedPhase = Math.max(0, Math.min(24, totalPhase));
    const phase = (cappedPhase * 256 + (24 / 2)) / 24;

    // Interpolate: score = ((egScore * (256 - phase)) + (mgScore * phase)) / 256
    let score = ((egScore * (256 - phase)) + (mgScore * phase)) / 256;

    // 6. Endgame Mop-up
    // Simplified mop-up: only if really winning and enemy has basically nothing
    const wPoints = state.board.flat().filter(p => p && p.color === 'w').reduce((acc, p) => acc + PHASE_WEIGHTS[p!.type], 0);
    const bPoints = state.board.flat().filter(p => p && p.color === 'b').reduce((acc, p) => acc + PHASE_WEIGHTS[p!.type], 0);

    if ((wPoints === 0 && bPoints > 4) || (bPoints === 0 && wPoints > 4)) {
        const winningColor = wPoints > 0 ? 'w' : 'b';
        const losingKingPos = winningColor === 'w' ? blackKingPos : whiteKingPos;
        const winningKingPos = winningColor === 'w' ? whiteKingPos : blackKingPos;

        const centerDist = Math.max(3 - losingKingPos.rank, losingKingPos.rank - 4) + Math.max(3 - losingKingPos.file, losingKingPos.file - 4);
        const distBetweenKings = Math.abs(winningKingPos.rank - losingKingPos.rank) + Math.abs(winningKingPos.file - losingKingPos.file);

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

function isPassedPawn(state: GameState, square: Square, color: Color): boolean {
    const direction = color === 'w' ? -1 : 1;
    const opponentColor = color === 'w' ? 'b' : 'w';

    // Check ranks ahead on the same file and adjacent files
    for (let r = square.rank + direction; r >= 0 && r < 8; r += direction) {
        for (let f = square.file - 1; f <= square.file + 1; f++) {
            if (f < 0 || f > 7) continue;
            const piece = state.board[r][f];
            if (piece && piece.type === 'p' && piece.color === opponentColor) {
                return false;
            }
        }
    }
    return true;
}

function isPawnProtected(state: GameState, square: Square, color: Color): boolean {
    const protectDir = color === 'w' ? 1 : -1; // Pawns protect diagonals behind them relative to their move dir
    const attackerRank = square.rank + protectDir;
    if (attackerRank < 0 || attackerRank > 7) return false;

    const files = [square.file - 1, square.file + 1];
    for (const f of files) {
        if (f < 0 || f > 7) continue;
        const p = state.board[attackerRank][f];
        if (p && p.type === 'p' && p.color === color) return true;
    }
    return false;
}
