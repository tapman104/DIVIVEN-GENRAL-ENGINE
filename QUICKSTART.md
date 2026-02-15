# DIVIVEN GENERAL ENGINE - Quick Reference

**Fast integration guide for developers**

---

## Install

```bash
npm install diviven-general-engine
```

---

## Import (Choose One)

```typescript
// Web/React/Mobile (Async, Non-blocking)
import { ChessEngineBridge } from 'diviven-general-engine/src/bridge';

// Node.js/Simple Apps (Sync)
import { search } from 'diviven-general-engine/src/search';
```

---

## Core Imports

```typescript
import { parseFEN, toFEN, applyMove, cloneState } from 'diviven-general-engine/src/board';
import { generateLegalMoves, isCheck } from 'diviven-general-engine/src/rules';
import { LEVELS } from 'diviven-general-engine/src/levels';
import { evaluate } from 'diviven-general-engine/src/eval';
import { getBookMove } from 'diviven-general-engine/src/openings';
```

---

## Quick Start (3 Lines)

```typescript
const engine = new ChessEngineBridge();
const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
const result = await engine.findBestMove(state, LEVELS[5]);
```

---

## API Cheat Sheet

### Board
```typescript
parseFEN(fen: string) → GameState
toFEN(state: GameState) → string
applyMove(state: GameState, move: Move) → GameState
cloneState(state: GameState) → GameState
```

### Moves
```typescript
generateLegalMoves(state: GameState) → Move[]
isCheck(state: GameState, color: 'w'|'b') → boolean
parseMove(state: GameState, algebraic: string) → Move | null
```

### Search
```typescript
search(state: GameState, config: SearchConfig) → SearchResult
stopSearch() → void
```

### Engine (Async)
```typescript
engine.findBestMove(state, config) → Promise<SearchResult>
engine.cancelSearch() → void
engine.terminate() → void
```

---

## Difficulty Levels

```typescript
LEVELS[1]  // 50ms,  depth 2  (Beginner)
LEVELS[3]  // 100ms, depth 3  (Easy)
LEVELS[5]  // 200ms, depth 4  (Medium) ← Recommended
LEVELS[7]  // 1s,    depth 6  (Hard)
LEVELS[10] // 3s,    depth 8  (Expert)
```

---

## Common Patterns

### Check if game is over
```typescript
const moves = generateLegalMoves(state);
const inCheck = isCheck(state, state.turn);

if (moves.length === 0) {
    if (inCheck) {
        console.log('Checkmate!');
    } else {
        console.log('Stalemate!');
    }
}
```

### Custom difficulty
```typescript
const result = search(state, {
    maxDepth: 6,
    maxTimeMs: 2000,
    useOpeningBook: true,
    riskFactor: 0.0  // 0 = safe, 1 = aggressive
});
```

### Get position evaluation
```typescript
const score = evaluate(state);
console.log('Score:', score / 100, 'pawns');
// Positive = white advantage, negative = black advantage
```

### Use opening book
```typescript
const bookMove = getBookMove(toFEN(state));
if (bookMove) {
    const move = parseMove(state, bookMove);
    state = applyMove(state, move);
} else {
    // Out of book, use engine
    const result = search(state, LEVELS[5]);
}
```

---

## React Hook Example

```typescript
import { useState, useEffect, useRef } from 'react';
import { ChessEngineBridge } from 'diviven-general-engine/src/bridge';

function useChessEngine(level = 5) {
    const [thinking, setThinking] = useState(false);
    const engineRef = useRef(null);

    useEffect(() => {
        engineRef.current = new ChessEngineBridge();
        return () => engineRef.current?.terminate();
    }, []);

    const findMove = async (state) => {
        setThinking(true);
        try {
            return await engineRef.current.findBestMove(state, LEVELS[level]);
        } finally {
            setThinking(false);
        }
    };

    return { findMove, thinking };
}
```

---

## Types

```typescript
interface GameState {
    board: (Piece | null)[][];  // 8x8 array
    turn: 'w' | 'b';
    castlingRights: CastlingRights;
    enPassantSquare: Square | null;
    halfMoveClock: number;
    fullMoveNumber: number;
}

interface Move {
    from: Square;
    to: Square;
    promotion?: PieceType;
    isCapture: boolean;
    isCheck: boolean;
    isCastling: boolean;
    isEnPassant: boolean;
}

interface SearchResult {
    move: Move;
    score: number;        // Centipawns (100 = 1 pawn)
    depthReached: number;
    nodesSearched: number;
    pv?: Move[];          // Principal variation
    fromBook?: boolean;
}
```

---

## Performance Tips

| Device      | Recommended Level | Max Time |
|-------------|-------------------|----------|
| Phone       | 1-3               | 100ms    |
| Tablet      | 3-5               | 200ms    |
| Desktop     | 5-8               | 1-2s     |
| Server/AI   | 8-10              | 3-10s    |

---

## Error Handling

```typescript
try {
    const result = await engine.findBestMove(state, config);
} catch (error) {
    // Fallback to random move
    const moves = generateLegalMoves(state);
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
}
```

---

## Full Documentation

- [API Reference](docs/api.md) - Complete API docs
- [Examples](examples.js) - 10+ usage examples
- [Architecture](docs/engine.md) - Engine internals

---

**That's it! You're ready to integrate the engine. 🚀**
