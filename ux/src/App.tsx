import { useState, useEffect, useRef } from 'react';
import { Chessboard } from './components/Chessboard';
import { ChessEngineBridge } from './engine/bridge';
import { parseFEN, applyMove } from './engine/board';
import { generateLegalMoves } from './engine/rules';
import { LEVELS } from './engine/levels';
import { updateAdaptX } from './engine/adaptx';
import type { AdaptXState } from './engine/adaptx';
import type { GameState, Move, Square, Piece } from './engine/types';
import './App.css';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface HistoryItem {
  move: Move;
  san: string;
  turn: 'w' | 'b';
}

function App() {
  const [state, setState] = useState<GameState>(parseFEN(START_FEN));
  const [level, setLevel] = useState(5);
  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [engineStats, setEngineStats] = useState({ depth: 0, nodes: 0, score: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const [adaptx, setAdaptx] = useState<AdaptXState>({ userBlunderCount: 0, riskFactor: 0, stressLevel: 0 });
  const [prevEval, setPrevEval] = useState(0);
  const bridge = useRef<ChessEngineBridge | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bridge.current = new ChessEngineBridge();
    return () => bridge.current?.terminate();
  }, []);

  useEffect(() => {
    // Auto-scroll move list
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const legalMoves = generateLegalMoves(state);

  const getSimpleSAN = (move: Move, piece: Piece, isCheck: boolean, isMate: boolean): string => {
    let san = '';
    if (piece.type !== 'p') san += piece.type.toUpperCase();
    if (move.isCapture) {
      if (piece.type === 'p') san += String.fromCharCode(97 + move.from.file);
      san += 'x';
    }
    san += String.fromCharCode(97 + move.to.file) + (8 - move.to.rank);
    if (move.isCastling) san = move.to.file > move.from.file ? 'O-O' : 'O-O-O';
    if (isMate) san += '#';
    else if (isCheck) san += '+';
    return san;
  };

  const playSound = (type: 'move' | 'capture' | 'check' | 'castle') => {
    if (isMuted) return;
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.play().catch(e => console.log('Audio play blocked:', e));
  };

  const executeMove = (move: Move, nextState: GameState) => {
    const piece = state.board[move.from.rank][move.from.file];
    if (!piece) return;

    // Check detection for SAN
    // We already have nextState, so we check if the opponent king is attacked
    // Ideally we'd use isCheck(nextState, nextState.turn) but we need to import it or assume
    // For now we use the move.isCheck flag which might be populated or we assume basic SAN
    const san = getSimpleSAN(move, piece, move.isCheck, false);

    setHistory(prev => [...prev, { move, san, turn: state.turn }]);
    setState(nextState);
    setLastMove(move);

    if (move.isCheck) playSound('check');
    else if (move.isCapture) playSound('capture');
    else playSound('move');
  };

  const handleMove = async (from: Square, to: Square) => {
    const move = legalMoves.find(m =>
      m.from.rank === from.rank &&
      m.from.file === from.file &&
      m.to.rank === to.rank &&
      m.to.file === to.file
    );

    if (move) {
      const nextState = applyMove(state, move);
      executeMove(move, nextState);

      if (nextState.turn === 'b') {
        setIsThinking(true);
        try {
          const searchConfig = {
            ...LEVELS[level],
            riskFactor: adaptx.riskFactor
          };
          const result = await bridge.current?.findBestMove(nextState, searchConfig);
          if (result && result.move) {
            const finalState = applyMove(nextState, result.move!);

            // Execute engine move
            const piece = nextState.board[result.move.from.rank][result.move.from.file];
            const san = piece ? getSimpleSAN(result.move, piece, result.move.isCheck, false) : '...';

            setState(finalState);
            setLastMove(result.move);
            setHistory(prev => [...prev, { move: result.move!, san, turn: 'b' }]);

            const currentEval = result.score / 100;
            setEngineStats({
              depth: result.depthReached,
              nodes: result.nodesSearched,
              score: currentEval
            });

            // Update AdaptX based on the eval swing
            setAdaptx(prev => updateAdaptX(prev, prevEval, currentEval));
            setPrevEval(currentEval);

            if (result.move.isCheck) playSound('check');
            else if (result.move.isCapture) playSound('capture');
            else playSound('move');
          }
        } catch (err) {
          console.error('Engine error:', err);
        } finally {
          setIsThinking(false);
        }
      }
    }
  };

  const resetGame = () => {
    setState(parseFEN(START_FEN));
    setLastMove(null);
    setHistory([]);
    setEngineStats({ depth: 0, nodes: 0, score: 0 });
    setAdaptx({ userBlunderCount: 0, riskFactor: 0, stressLevel: 0 });
    setPrevEval(0);
    bridge.current?.cancelSearch();
    setIsThinking(false);
  };

  // GRAVEYARD CALCULATION
  const getGraveyard = () => {
    const whiteCaptured: string[] = [];
    const blackCaptured: string[] = [];
    let materialScore = 0;

    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    history.forEach(item => {
      if (item.move.capturedPiece) {
        const type = item.move.capturedPiece.type;
        const color = item.move.capturedPiece.color;
        const val = values[type] || 0;

        if (color === 'w') {
          blackCaptured.push(type); // Black captured White
          materialScore -= val;
        } else {
          whiteCaptured.push(type); // White captured Black
          materialScore += val;
        }
      }
    });

    return { whiteCaptured, blackCaptured, materialScore };
  };

  const { whiteCaptured, blackCaptured, materialScore } = getGraveyard();

  const getPieceIcon = (type: string, color: string) =>
    `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/${color}${type.toUpperCase()}.svg`;

  return (
    <div className="app-container">
      <header>
        <h1>DIVIVEN GENERAL</h1>
        <p>Advanced Strategic Intelligence</p>
      </header>

      <main>
        <div className="game-layout">
          <div>
            {/* GRAVEYARD TOP (BLACK CAPTURED BY WHITE) */}
            <div className="graveyard">
              <div className="graveyard-pieces">
                {whiteCaptured.map((p, i) => <img key={i} src={getPieceIcon(p, 'b')} className="dead-piece" />)}
              </div>
              {materialScore > 0 && <div className="material-advantage">+{materialScore}</div>}
            </div>

            <Chessboard
              state={state}
              onMove={handleMove}
              legalMoves={state.turn === 'w' ? legalMoves : []}
              lastMove={lastMove}
              isThinking={isThinking}
            />

            {/* GRAVEYARD BOTTOM (WHITE CAPTURED BY BLACK) */}
            <div className="graveyard">
              <div className="graveyard-pieces">
                {blackCaptured.map((p, i) => <img key={i} src={getPieceIcon(p, 'w')} className="dead-piece" />)}
              </div>
              {materialScore < 0 && <div className="material-advantage">+{Math.abs(materialScore)}</div>}
            </div>
          </div>

          <aside className="control-panel">
            <div className="status-group">
              <div className="status">
                <div className={`indicator ${isThinking ? 'pulse' : ''}`} />
                <h3>{isThinking ? 'THINKING' : `${state.turn === 'w' ? 'WHITE' : 'BLACK'} TO MOVE`}</h3>
              </div>
              <div className="engine-stats">
                <div className="telemetry-line">
                  <span className="label">DEPTH</span>
                  <span className="value">{engineStats.depth}</span>
                </div>
                <div className="telemetry-line">
                  <span className="label">EVAL</span>
                  <span className="value">{engineStats.score > 0 ? '+' : ''}{engineStats.score.toFixed(2)}</span>
                </div>
                <div className="risk-visualizer">
                  <div className="risk-label">
                    <span>RISK</span>
                    <span>{(adaptx.riskFactor * 100).toFixed(0)}%</span>
                  </div>
                  <div className="risk-bar-bg">
                    <div
                      className="risk-bar-fill"
                      style={{
                        width: `${adaptx.riskFactor * 100}%`,
                        background: adaptx.riskFactor > 0.5 ? '#ff3b30' : '#007aff',
                        boxShadow: `0 0 10px ${adaptx.riskFactor > 0.5 ? 'rgba(255, 59, 48, 0.4)' : 'rgba(0, 122, 255, 0.4)'}`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MOVE LIST - Repositioned Below Stats */}
            <div className="move-list-panel">
              <div className="panel-header">GAME HISTORY</div>
              <div className="move-list" ref={scrollRef}>
                {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                  <div key={i} className="move-row">
                    <span className="move-num">{i + 1}.</span>
                    <span className="move-san">{history[i * 2]?.san}</span>
                    <span className="move-san">{history[i * 2 + 1]?.san}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="difficulty">
              <label>Difficulty</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value))}
                />
                <span className="level-badge">LV {level}</span>
              </div>
            </div>

            <div className="actions">
              <button className="btn-primary" onClick={resetGame}>NEW GAME</button>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button className="btn-ghost" onClick={() => { }}>UNDO</button>
                <button className="btn-ghost" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? 'UNMUTE' : 'MUTE'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
