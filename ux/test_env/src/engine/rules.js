"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countAttackers = countAttackers;
exports.isSquareAttacked = isSquareAttacked;
exports.getSquareAnalysis = getSquareAnalysis;
exports.findKing = findKing;
exports.isCheck = isCheck;
exports.generateLegalMoves = generateLegalMoves;
const movegen_1 = require("./movegen");
const board_1 = require("./board");
function countAttackers(state, square, attackerColor) {
    const { board } = state;
    let count = 0;
    // 1. Knight attacks
    const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, df] of knightOffsets) {
        const r = square.rank + dr;
        const f = square.file + df;
        if (r >= 0 && r < 8 && f >= 0 && f < 8) {
            const piece = board[r][f];
            if (piece && piece.type === 'n' && piece.color === attackerColor)
                count++;
        }
    }
    // 2. King attacks
    const kingOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    for (const [dr, df] of kingOffsets) {
        const r = square.rank + dr;
        const f = square.file + df;
        if (r >= 0 && r < 8 && f >= 0 && f < 8) {
            const piece = board[r][f];
            if (piece && piece.type === 'k' && piece.color === attackerColor)
                count++;
        }
    }
    // 3. Pawn attacks
    const pawnDirection = attackerColor === 'w' ? 1 : -1;
    const pawnFiles = [square.file - 1, square.file + 1];
    const attackerRank = square.rank + pawnDirection;
    if (attackerRank >= 0 && attackerRank < 8) {
        for (const f of pawnFiles) {
            if (f >= 0 && f < 8) {
                const piece = board[attackerRank][f];
                if (piece && piece.type === 'p' && piece.color === attackerColor)
                    count++;
            }
        }
    }
    // 4. Sliding pieces
    const directions = [
        { dr: -1, df: 0, types: ['r', 'q'] },
        { dr: 1, df: 0, types: ['r', 'q'] },
        { dr: 0, df: -1, types: ['r', 'q'] },
        { dr: 0, df: 1, types: ['r', 'q'] },
        { dr: -1, df: -1, types: ['b', 'q'] },
        { dr: -1, df: 1, types: ['b', 'q'] },
        { dr: 1, df: -1, types: ['b', 'q'] },
        { dr: 1, df: 1, types: ['b', 'q'] },
    ];
    for (const { dr, df, types } of directions) {
        let r = square.rank + dr;
        let f = square.file + df;
        while (r >= 0 && r < 8 && f >= 0 && f < 8) {
            const piece = board[r][f];
            if (piece) {
                if (piece.color === attackerColor && types.includes(piece.type))
                    count++;
                break;
            }
            r += dr;
            f += df;
        }
    }
    return count;
}
function isSquareAttacked(state, square, attackerColor) {
    return countAttackers(state, square, attackerColor) > 0;
}
function getSquareAnalysis(state, square) {
    const piece = state.board[square.rank][square.file];
    if (!piece)
        return { attackers: 0, defenders: 0, safetyScore: 0 };
    const opponentColor = piece.color === 'w' ? 'b' : 'w';
    const attackers = countAttackers(state, square, opponentColor);
    const defenders = countAttackers(state, square, piece.color);
    // Simplistic safety: neutral is 0, unsafe is negative, safe is positive
    let safetyScore = defenders - attackers;
    if (attackers > 0 && defenders === 0)
        safetyScore -= 5; // Hanging
    return { attackers, defenders, safetyScore };
}
function findKing(state, color) {
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = state.board[r][f];
            if (piece && piece.type === 'k' && piece.color === color) {
                return { rank: r, file: f };
            }
        }
    }
    throw new Error(`King not found for color ${color}`);
}
function isCheck(state, color) {
    const kingPos = findKing(state, color);
    const opponentColor = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(state, kingPos, opponentColor);
}
function generateLegalMoves(state) {
    const pseudoMoves = (0, movegen_1.generateMoves)(state);
    const legalMoves = [];
    for (const move of pseudoMoves) {
        const nextState = (0, board_1.applyMove)(state, move);
        // After my move, my King must not be attacked by the opponent
        const kingPos = findKing(nextState, state.turn);
        if (!isSquareAttacked(nextState, kingPos, nextState.turn)) {
            legalMoves.push(move);
        }
    }
    return legalMoves;
}
