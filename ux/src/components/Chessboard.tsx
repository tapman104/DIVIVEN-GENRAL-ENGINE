import React, { useState } from 'react';
import type { GameState, Move, Square } from '../engine/types';
import { getSquareAnalysis } from '../engine/rules';
import type { SquareAnalysis } from '../engine/rules';
import './Chessboard.css';

interface ChessboardProps {
    state: GameState;
    onMove?: (from: Square, to: Square) => void;
    legalMoves?: Move[];
    lastMove?: Move | null;
    isThinking?: boolean;
    capturedWhite?: string[]; // Pieces captured BY Black (visible for White player usually means white pieces lost? No, normally "Captured Material" shows what you killed, or what you lost. 
    // Convention: Top (opponent side) shows pieces White captured. Bottom (your side) shows pieces Black captured.
    // Or: "Graveyard" shows pieces LOST by that color.
    // Let's stick to: Top = Pieces Black Lost (White captured). Bottom = Pieces White Lost (Black captured).
    // Wait, typically you show the advantage. 
    // Let's pass "capturedByWhite" and "capturedByBlack".
    capturedByWhite?: string[];
    capturedByBlack?: string[];
    score?: number; // positive = white winning
}

export const Chessboard: React.FC<ChessboardProps> = ({
    state,
    onMove,
    legalMoves = [],
    lastMove,
    isThinking = false,
    capturedByWhite = [],
    capturedByBlack = [],
    score = 0
}) => {
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [hoveredSquare, setHoveredSquare] = useState<Square | null>(null);
    const [visionData, setVisionData] = useState<SquareAnalysis | null>(null);

    const handleSquareClick = (square: Square) => {
        if (selectedSquare) {
            const move = legalMoves.find(m =>
                m.from.rank === selectedSquare.rank &&
                m.from.file === selectedSquare.file &&
                m.to.rank === square.rank &&
                m.to.file === square.file
            );

            if (move) {
                onMove?.(selectedSquare, square);
                setSelectedSquare(null);
                return;
            }
        }

        const piece = state.board[square.rank][square.file];
        if (piece && piece.color === state.turn) {
            setSelectedSquare(square);
        } else {
            setSelectedSquare(null);
        }
    };

    const handleMouseEnter = (square: Square) => {
        setHoveredSquare(square);
        setVisionData(getSquareAnalysis(state, square));
    };

    const handleMouseLeave = () => {
        setHoveredSquare(null);
        setVisionData(null);
    };

    const isSelected = (r: number, f: number) =>
        selectedSquare?.rank === r && selectedSquare?.file === f;

    const isLegalTarget = (r: number, f: number) =>
        legalMoves.some(m =>
            selectedSquare &&
            m.from.rank === selectedSquare.rank &&
            m.from.file === selectedSquare.file &&
            m.to.rank === r &&
            m.to.file === f
        );

    const isLastMove = (r: number, f: number) =>
        lastMove && (
            (lastMove.from.rank === r && lastMove.from.file === f) ||
            (lastMove.to.rank === r && lastMove.to.file === f)
        );

    const getPieceIcon = (type: string, color: string) => {
        return `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/${color}${type.toUpperCase()}.svg`;
    };

    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    return (
        <div className={`chessboard-outer ${isThinking ? 'thinking' : ''}`}>
            {/* Top Graveyard (Captured by White / Black's dead pieces) */}
            <div className="graveyard top">
                <div className="graveyard-pieces">
                    {capturedByWhite.map((p, i) => (
                        <img key={i} src={getPieceIcon(p, 'b')} className="dead-piece" alt="" />
                    ))}
                </div>
                {score > 0 && <div className="material-advantage">+{score}</div>}
            </div>

            {/* Rank Coordinates */}
            <div className="coords-ranks">
                {ranks.map(r => <span key={r}>{r}</span>)}
            </div>

            <div className="chessboard-container">
                <div className="chessboard">
                    {state.board.map((row, r) => (
                        row.map((piece, f) => (
                            <div
                                key={`${r}-${f}`}
                                className={`square ${(r + f) % 2 === 0 ? 'light' : 'dark'} 
                                    ${isLastMove(r, f) ? 'last-move' : ''}
                                    ${hoveredSquare?.rank === r && hoveredSquare?.file === f ? 'hovered' : ''}`}
                                onClick={() => handleSquareClick({ rank: r, file: f })}
                                onMouseEnter={() => handleMouseEnter({ rank: r, file: f })}
                                onMouseLeave={handleMouseLeave}
                            >
                                {isSelected(r, f) && <div className="selection-ring" />}
                                {isLegalTarget(r, f) && <div className="legal-dot" />}
                                {piece && (
                                    <img
                                        src={getPieceIcon(piece.type, piece.color)}
                                        alt={`${piece.color} ${piece.type}`}
                                        className="piece"
                                        style={{
                                            transform: isSelected(r, f) ? 'scale(1.05)' : 'scale(1)'
                                        }}
                                    />
                                )}
                            </div>
                        ))
                    ))}
                </div>

                {visionData && (
                    <div className="vision-hud-capsule">
                        <div className="vision-stat"><small>DEFE</small> {visionData.defenders}</div>
                        <div className="vision-stat"><small>ATTR</small> {visionData.attackers}</div>
                        <div className={`vision-safety-glow ${visionData.safetyScore < 0 ? 'danger' : 'safe'}`} />
                    </div>
                )}
            </div>

            {/* File Coordinates */}
            <div className="coords-files">
                {files.map(f => <span key={f}>{f}</span>)}
            </div>

            {/* Bottom Graveyard (Captured by Black / White's dead pieces) */}
            <div className={`graveyard bottom`}>
                <div className="graveyard-pieces">
                    {capturedByBlack.map((p, i) => (
                        <img key={i} src={getPieceIcon(p, 'w')} className="dead-piece" alt="" />
                    ))}
                </div>
                {score < 0 && <div className="material-advantage">+{Math.abs(score)}</div>}
            </div>
        </div>
    );
};
