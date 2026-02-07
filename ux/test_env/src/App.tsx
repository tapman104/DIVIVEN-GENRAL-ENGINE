import { useState, useEffect, useRef } from 'react';
import { Chessboard } from './components/Chessboard';
import { ChessEngineBridge } from './engine/bridge';
import { parseFEN, applyMove, cloneState } from './engine/board';
import { generateLegalMoves, isCheck } from './engine/rules';
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
  const [engineStats, setEngineStats] = useState({ depth: 0, nodes: 0, score: 0, pv: [] as string[] });
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
  const isKingInCheck = isCheck(state, state.turn);
  const isGameOver = legalMoves.length === 0;

  let gameOverStatus = null;
  if (isGameOver) {
    if (isKingInCheck) gameOverStatus = 'Checkmate';
    else gameOverStatus = 'Stalemate';
  } else if (state.halfMoveClock >= 100) {
    gameOverStatus = 'Draw (50-move rule)';
  }

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
          // CHECK FOR PONDER HIT
          if (bridge.current && bridge.current['pendingPonderMove'] &&
            bridge.current['pendingPonderMove'].from.rank === from.rank &&
            bridge.current['pendingPonderMove'].from.file === from.file &&
            bridge.current['pendingPonderMove'].to.rank === to.rank &&
            bridge.current['pendingPonderMove'].to.file === to.file) {

            console.log("PONDER HIT!");
            // We reuse the result from the ponder search
            // In this simple implementation, we assume the ponder search was just a standard search
            // running in background.
            // We actually need to 'await' the ponder result.
            // But the simple bridge doesn't support attaching yet.
          }
          else {
            // PONDER MISS or NO PONDER
            bridge.current?.ponderMiss();
          }

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

            // Calculate PV SANs
            const pvSan: string[] = [];
            let tempState = cloneState(nextState); // clone from the position *after* user move
            // Wait, result.pv starts from nextState? 
            // In search.ts, search(state) returns best move from state.
            // If we search(nextState), the PV is from nextState (Black to move).
            // Yes.

            if (result.pv) {
              for (const m of result.pv) {
                const p = tempState.board[m.from.rank][m.from.file];
                if (p) {
                  pvSan.push(getSimpleSAN(m, p, m.isCheck, false)); // simplifying checks
                  tempState = applyMove(tempState, m);
                }
              }
            }

            setEngineStats({
              depth: result.depthReached,
              nodes: result.nodesSearched,
              score: currentEval,
              pv: pvSan
            });

            // Update AdaptX based on the eval swing
            setAdaptx(prev => updateAdaptX(prev, prevEval, currentEval));
            setPrevEval(currentEval);

            if (result.move.isCheck) playSound('check');
            else if (result.move.isCapture) playSound('capture');
            else playSound('move');

            // START PONDERING
            // 1. Guess user's move (for now, use a short search or just the Principal Variation if available)
            // Since we don't have PV, we'll just search the RESULT state for the best White move.
            // This effectively finds "What is White's best reply?"
            // Then we ponder Black's response to *that*.
            // SIMPLIFICATION: We just search from the CURRENT finalState (White to move).
            // We are looking for White's move.
            // Wait, "Pondering" usually means: "I think he will play X, so I will think about my reply to X".
            // So we need to:
            // 1. Find best move for White (Predicted Move)
            // 2. Apply Predicted Move -> Predicted State
            // 3. Start searching for Black's move in Predicted State.

            // For 100ms engine, we can just start a search regarding the current position (White to move).
            // If we find a move, that's our "prediction".
            // Then we'd need to assume he plays it.

            // ACTUALLY: A simpler "Ponder" for this level is "Permanent Brain".
            // Just let the engine analyze the current position (White to move) to fill the Transposition Table.
            // When White does move, the TT will already have entries for that position!
            // This is "Pondering on the current position", effectively pre-calculating the opponent's best move.
            // When opponent plays specific move, we might already have the answer if we guessed right?
            // No, we need to think about *our* reply.

            // Let's stick to "Fill TT" strategy.
            // We start a search on `finalState` (White to move). 
            // We ignore the result, but the TT gets filled.
            // When user actually moves, `findBestMove` is called.
            // It will access the TT.

            bridge.current?.startPonder(finalState, null, { ...searchConfig, maxTimeMs: 5000 }); // Give it plenty of time
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
    setHistory([]);
    setEngineStats({ depth: 0, nodes: 0, score: 0, pv: [] });
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


  // Dynamic Theme Engine
  const getThemeColor = (lvl: number) => {
    if (lvl <= 3) return '#32d74b'; // Green (Safe/Easy)
    if (lvl <= 6) return '#0a84ff'; // Blue (Focus/Medium)
    if (lvl <= 9) return '#bf5af2'; // Purple (Master/Hard)
    return '#ff453a'; // Red (Danger/Divine)
  };

  const [analysisResult, setAnalysisResult] = useState<import('./engine/bridge').GameAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!bridge.current || history.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await bridge.current.analyzeGame(START_FEN, history);
      setAnalysisResult(result);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const AnalysisPanel = ({ result, onClose }: { result: import('./engine/bridge').GameAnalysisResult, onClose: () => void }) => {
    return (
      <div className="game-over-overlay">
        <div className="game-over-modal" style={{ maxWidth: '800px', width: '90%' }}>
          <h2>GAME ANALYSIS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left' }}>
            <div className="analysis-summary">
              <h3>ACCURACY: <span style={{ color: result.accuracy >= 90 ? '#32d74b' : result.accuracy >= 70 ? '#0a84ff' : '#ff453a' }}>{result.accuracy.toFixed(1)}%</span></h3>
              <div className="stat-row"><span>Brilliant (!!)</span> <span style={{ color: '#00d1b2' }}>{result.summary.brilliant}</span></div>
              <div className="stat-row"><span>Best Move (★)</span> <span style={{ color: '#32d74b' }}>{result.summary.best}</span></div>
              <div className="stat-row"><span>Good (!)</span> <span style={{ color: '#3298dc' }}>{result.summary.good}</span></div>
              <div className="stat-row"><span>Inaccuracy (?!)</span> <span style={{ color: '#ffdd57' }}>{result.summary.inaccuracy}</span></div>
              <div className="stat-row"><span>Mistake (?)</span> <span style={{ color: '#ff9500' }}>{result.summary.mistake}</span></div>
              <div className="stat-row"><span>Blunder (??)</span> <span style={{ color: '#ff3b30' }}>{result.summary.blunder}</span></div>
            </div>
            <div className="analysis-moves" style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
              {result.details.map((move, i) => (
                <div key={i} style={{ padding: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{Math.floor(move.moveIndex / 2) + 1}. {history[move.moveIndex]?.san}</span>
                  <span className={`eval-${move.classification.toLowerCase()}`} style={{
                    color: move.classification === 'Brilliant' ? '#00d1b2' :
                      move.classification === 'Best' ? '#32d74b' :
                        move.classification === 'Good' ? '#3298dc' :
                          move.classification === 'Inaccuracy' ? '#ffdd57' :
                            move.classification === 'Mistake' ? '#ff9500' :
                              move.classification === 'Blunder' ? '#ff3b30' : '#8e8e93'
                  }}>
                    {move.classification}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    );
  };

  const themeColor = getThemeColor(level);

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const themeRgb = hexToRgb(themeColor);

  return (
    <div className="app-container" style={{ '--accent-color': themeColor, '--accent-rgb': themeRgb } as React.CSSProperties}>
      {/* ... (Header/Modal omitted - assuming unchanged) ... */}
      {gameOverStatus && !analysisResult && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>{gameOverStatus}</h2>
            <p>{gameOverStatus === 'Checkmate' ? (state.turn === 'w' ? 'Black Wins!' : 'White Wins!') : 'Game Over'}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn-primary" onClick={resetGame}>PLAY AGAIN</button>
              <button className="btn-ghost" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? 'ANALYZING...' : 'ANALYZE GAME'}
              </button>
            </div>
          </div>
        </div>
      )}

      {analysisResult && (
        <AnalysisPanel result={analysisResult} onClose={() => setAnalysisResult(null)} />
      )}

      <header>
        <h1 style={{ textShadow: `0 0 30px ${themeColor}66` }}>DIVIVEN GENERAL</h1>
        <p>Advanced Strategic Intelligence</p>
      </header>

      <main>
        <div className="game-layout">
          <div>
            <Chessboard
              state={state}
              onMove={handleMove}
              legalMoves={state.turn === 'w' ? legalMoves : []}
              lastMove={lastMove}
              isThinking={isThinking}
              capturedByWhite={whiteCaptured}
              capturedByBlack={blackCaptured}
              score={materialScore}
            />
          </div>

          <aside className="control-panel">
            <div className="status-group">
              <div className="status">
                <div className={`indicator ${isThinking ? 'pulse' : ''}`} />
                <h3>{isThinking ? 'THINKING' : `${state.turn === 'w' ? 'WHITE' : 'BLACK'} TO MOVE`}</h3>
              </div>

              <div className="engine-stats">
                {/* Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="label">EVAL</span>
                    <span className="value large">{engineStats.score > 0 ? '+' : ''}{engineStats.score.toFixed(2)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">DEPTH</span>
                    <span className="value">{engineStats.depth}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">NODES</span>
                    <span className="value">{engineStats.nodes}</span>
                  </div>
                </div>

                {/* THOUGHT PROCESS (PV) */}
                <div className="pv-panel">
                  <div className="pv-label">ANALYSIS LINE</div>
                  <div className="pv-content">
                    {engineStats.pv.length > 0 ? (
                      engineStats.pv.map((moveStr, i) => (
                        <span key={i} className="pv-move">
                          {i % 2 === 0 ? `${Math.floor(history.length / 2) + 1 + Math.floor(i / 2)}.` : ''} {moveStr}
                        </span>
                      ))
                    ) : (
                      <span className="pv-placeholder">Waiting for analysis...</span>
                    )}
                  </div>
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
              <div className="difficulty-grid">
                <button
                  className={`diff-btn ${level === 1 ? 'active' : ''}`}
                  onClick={() => setLevel(1)}
                >
                  EASY
                </button>
                <button
                  className={`diff-btn ${level === 4 ? 'active' : ''}`}
                  onClick={() => setLevel(4)}
                >
                  MEDIUM
                </button>
                <button
                  className={`diff-btn ${level === 6 ? 'active' : ''}`}
                  onClick={() => setLevel(6)}
                >
                  HARD
                </button>
                <button
                  className={`diff-btn ${level === 8 ? 'active' : ''}`}
                  onClick={() => setLevel(8)}
                >
                  GM
                </button>
                <button
                  className={`diff-btn diff-btn-divine ${level === 10 ? 'active' : ''}`}
                  onClick={() => setLevel(10)}
                >
                  DIVINE GENERAL
                </button>
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


