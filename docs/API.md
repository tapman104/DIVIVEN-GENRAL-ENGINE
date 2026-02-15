# DIVIVEN GENERAL ENGINE - API Documentation

**Version:** 2.0  
**A standalone, embeddable chess engine for JavaScript/TypeScript applications**

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core API](#core-api)
4. [Worker API (Async/Non-blocking)](#worker-api)
5. [Types & Interfaces](#types--interfaces)
6. [Configuration](#configuration)
7. [Advanced Features](#advanced-features)
8. [Integration Examples](#integration-examples)

---

## Installation

### NPM (Recommended)
```bash
npm install diviven-general-engine
```

### Manual
Clone the repository and import the source files directly:
```bash
git clone https://github.com/yourusername/diviven-general-engine.git
```

---

## Quick Start

### Synchronous Usage (Node.js/Simple Apps)

```typescript
import { search } from 'diviven-general-engine/src/search.js';
import { parseFEN } from 'diviven-general-engine/src/board.js';
import { LEVELS } from 'diviven-general-engine/src/levels.js';

// Parse starting position
const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

// Find best move (Level 5 difficulty)
const result = search(state, LEVELS[5]);

console.log('Best move:', result.move);
console.log('Score:', result.score);
console.log('Depth:', result.depthReached);
console.log('Nodes:', result.nodesSearched);
```

### Asynchronous Usage (Web/React/Mobile)

```typescript
import { ChessEngineBridge } from 'diviven-general-engine/src/bridge.js';
import { parseFEN } from 'diviven-general-engine/src/board.js';
import { LEVELS } from 'diviven-general-engine/src/levels.js';

const engine = new ChessEngineBridge();
const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

const result = await engine.findBestMove(state, LEVELS[5]);
console.log('Best move:', result.move);

// Clean up
engine.terminate();
```

---

## Core API

### Board & State Management

#### `parseFEN(fen: string): GameState`
Parses a FEN string into a GameState object.

```typescript
import { parseFEN } from './src/board.js';

const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
```

#### `toFEN(state: GameState): string`
Converts a GameState back to FEN notation.

```typescript
import { toFEN } from './src/board.js';

const fen = toFEN(state);
console.log(fen); // "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
```

#### `applyMove(state: GameState, move: Move): GameState`
Applies a move to a game state, returning a **new** GameState (immutable).

```typescript
import { applyMove } from './src/board.js';

const newState = applyMove(state, move);
```

#### `cloneState(state: GameState): GameState`
Deep clones a game state (useful for UI snapshots/undo).

```typescript
import { cloneState } from './src/board.js';

const snapshot = cloneState(state);
```

---

### Move Generation

#### `generateLegalMoves(state: GameState): Move[]`
Generates all legal moves for the current position.

```typescript
import { generateLegalMoves } from './src/rules.js';

const moves = generateLegalMoves(state);
console.log(`${moves.length} legal moves available`);
```

#### `isCheck(state: GameState, color: 'w' | 'b'): boolean`
Checks if the specified color's king is in check.

```typescript
import { isCheck } from './src/rules.js';

if (isCheck(state, 'w')) {
    console.log('White is in check!');
}
```

#### `parseMove(state: GameState, algebraic: string): Move | null`
Converts algebraic notation (e.g., "e2e4") to a Move object.

```typescript
import { parseMove } from './src/movegen.js';

const move = parseMove(state, 'e2e4');
if (move) {
    const newState = applyMove(state, move);
}
```

---

### Search & Engine

#### `search(state: GameState, config: SearchConfig): SearchResult`
**Main engine function.** Finds the best move for the current position.

```typescript
import { search } from './src/search.js';

const result = search(state, {
    maxDepth: 6,
    maxTimeMs: 2000,
    useOpeningBook: true,
    riskFactor: 0.0  // 0.0 = safe, 1.0 = aggressive
});

console.log('Best move:', result.move);
console.log('Evaluation:', result.score / 100, 'pawns');
console.log('Principal Variation:', result.pv);
```

**SearchConfig Properties:**
- `maxDepth: number` - Maximum search depth (typically 1-10)
- `maxTimeMs?: number` - Maximum search time in milliseconds
- `useOpeningBook?: boolean` - Use opening book (default: true)
- `riskFactor?: number` - Aggression level (0.0-1.0, default: 0.0)

**SearchResult Properties:**
- `move: Move` - The best move found
- `score: number` - Centipawn evaluation (100 = 1 pawn advantage)
- `depthReached: number` - Actual depth searched
- `nodesSearched: number` - Total positions evaluated
- `pv?: Move[]` - Principal variation (best continuation)
- `fromBook?: boolean` - True if move came from opening book

#### `stopSearch(): void`
Stops an ongoing search (cooperative cancellation).

```typescript
import { stopSearch } from './src/search.js';

// Start search in another thread/async context
setTimeout(() => stopSearch(), 1000); // Cancel after 1 second
```

---

### Difficulty Levels

#### `LEVELS: Record<number, SearchConfig>`
Pre-configured difficulty levels (1-10).

```typescript
import { LEVELS } from './src/levels.js';

// Level 1 - Beginner (50ms, depth 2)
const easyResult = search(state, LEVELS[1]);

// Level 5 - Intermediate (200ms, depth 4)
const mediumResult = search(state, LEVELS[5]);

// Level 10 - Maximum (3000ms, depth 8)
const hardResult = search(state, LEVELS[10]);
```

**Level Breakdown:**
- **1-3**: Beginner (50-100ms, depth 2-3)
- **4-6**: Intermediate (200-500ms, depth 4-5)
- **7-9**: Advanced (1000-2000ms, depth 6-7)
- **10**: Divine General (3000ms, depth 8)

---

### Opening Book

#### `getBookMove(fen: string): string | null`
Returns a book move for common opening positions.

```typescript
import { getBookMove } from './src/openings.js';

const bookMove = getBookMove(fen);
if (bookMove) {
    console.log('Opening book suggests:', bookMove);
}
```

---

### Evaluation

#### `evaluate(state: GameState): number`
Static evaluation of a position (in centipawns).

```typescript
import { evaluate } from './src/eval.js';

const score = evaluate(state);
console.log('Position eval:', score / 100, 'pawns');
```

---

## Worker API

For non-blocking search in web/mobile applications, use `ChessEngineBridge`:

### `new ChessEngineBridge()`
Creates a new engine worker instance.

```typescript
import { ChessEngineBridge } from './src/bridge.js';

const engine = new ChessEngineBridge();
```

### `findBestMove(state: GameState, config: SearchConfig): Promise<SearchResult>`
Finds the best move asynchronously.

```typescript
const result = await engine.findBestMove(state, LEVELS[5]);
```

### `cancelSearch(): void`
Cancels the current search.

```typescript
engine.cancelSearch();
```

### `terminate(): void`
Terminates the worker thread.

```typescript
engine.terminate();
```

---

## Types & Interfaces

### Core Types

```typescript
// Game State
interface GameState {
    board: Board;                    // 8x8 array of pieces
    turn: 'w' | 'b';                 // Current player
    castlingRights: CastlingRights;  // Castling availability
    enPassantSquare: Square | null;  // En passant target
    halfMoveClock: number;           // 50-move rule counter
    fullMoveNumber: number;          // Full move counter
}

// Board (8x8 grid)
type Board = (Piece | null)[][];

// Piece
interface Piece {
    type: PieceType;  // 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
    color: 'w' | 'b';
}

// Square (0-indexed, rank 0 = rank 8)
interface Square {
    rank: number;  // 0-7
    file: number;  // 0-7
}

// Move
interface Move {
    from: Square;
    to: Square;
    promotion?: PieceType;
    isCapture: boolean;
    isCheck: boolean;
    isCastling: boolean;
    isEnPassant: boolean;
    capturedPiece?: Piece;
}

// Castling Rights
interface CastlingRights {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
}
```

### Search Types

```typescript
interface SearchConfig {
    maxDepth: number;
    maxTimeMs?: number;
    useOpeningBook?: boolean;
    riskFactor?: number;
}

interface SearchResult {
    move: Move;
    score: number;
    depthReached: number;
    nodesSearched: number;
    pv?: Move[];
    fromBook?: boolean;
}
```

---

## Configuration

### Custom Search Parameters

```typescript
const customConfig: SearchConfig = {
    maxDepth: 7,
    maxTimeMs: 5000,
    useOpeningBook: true,
    riskFactor: 0.3  // Slightly aggressive
};

const result = search(state, customConfig);
```

### Transposition Table Size

The engine uses a global transposition table. You can configure it by modifying `src/tt.ts`:

```typescript
// Default: 1M entries
const tt = new TranspositionTable(1_000_000);
```

---

## Advanced Features

### 1. Opening Book Integration

The engine includes a curated opening book for common positions:

```typescript
import { getBookMove } from './src/openings.js';
import { toFEN } from './src/board.js';

const fen = toFEN(state);
const bookMove = getBookMove(fen);

if (bookMove) {
    // Use book move (instant response)
} else {
    // Fall back to engine search
    const result = search(state, config);
}
```

### 2. Adaptive Difficulty (AdaptX)

For dynamic difficulty adjustment based on player performance:

```typescript
import { updateAdaptX } from './src/adaptx.js';

let adaptx = { userBlunderCount: 0, riskFactor: 0, stressLevel: 0 };

// After each move, update AdaptX
const prevEval = 0.5;
const currentEval = -1.2; // Player made a mistake
adaptx = updateAdaptX(adaptx, prevEval, currentEval);

// Use updated risk factor
const result = search(state, {
    ...LEVELS[5],
    riskFactor: adaptx.riskFactor
});
```

### 3. Principal Variation (PV)

The engine returns the best continuation line:

```typescript
const result = search(state, LEVELS[6]);

if (result.pv) {
    console.log('Engine thinks the best continuation is:');
    result.pv.forEach((move, i) => {
        console.log(`${i + 1}. ${moveToAlgebraic(move)}`);
    });
}
```

### 4. Performance Testing (Perft)

For debugging and validation:

```typescript
import { perft } from './src/perft.js';

const nodes = perft(state, 5); // Depth 5
console.log(`Perft(5): ${nodes} nodes`);
```

---

## Integration Examples

### React Integration

```tsx
import { useState } from 'react';
import { ChessEngineBridge } from 'diviven-general-engine/src/bridge';
import { parseFEN } from 'diviven-general-engine/src/fen';
import { LEVELS } from 'diviven-general-engine/src/levels';

function ChessApp() {
    const [engine] = useState(() => new ChessEngineBridge());
    const [state, setState] = useState(() => parseFEN('startpos FEN'));
    const [thinking, setThinking] = useState(false);

    const makeEngineMove = async () => {
        setThinking(true);
        const result = await engine.findBestMove(state, LEVELS[5]);
        setState(applyMove(state, result.move));
        setThinking(false);
    };

    return <div>{/* Your UI */}</div>;
}
```

### Vue Integration

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ChessEngineBridge } from 'diviven-general-engine/src/bridge';
import { parseFEN } from 'diviven-general-engine/src/fen';
import { LEVELS } from 'diviven-general-engine/src/levels';

const engine = new ChessEngineBridge();
const state = ref(parseFEN('startpos FEN'));
const thinking = ref(false);

async function makeEngineMove() {
    thinking.value = true;
    const result = await engine.findBestMove(state.value, LEVELS[5]);
    state.value = applyMove(state.value, result.move);
    thinking.value = false;
}

onUnmounted(() => engine.terminate());
</script>
```

### Node.js CLI

```javascript
const { search } = require('diviven-general-engine/src/search');
const { parseFEN } = require('diviven-general-engine/src/fen');
const { LEVELS } = require('diviven-general-engine/src/levels');

const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
const result = search(state, LEVELS[7]);

console.log(`Engine suggests: ${moveToNotation(result.move)}`);
console.log(`Evaluation: ${(result.score / 100).toFixed(2)} pawns`);
```

---

## Best Practices

### 1. Use Worker API for UI Applications
Always use `ChessEngineBridge` in browser/mobile apps to prevent UI freezing.

### 2. Terminate Workers
Always call `engine.terminate()` when done to free resources.

### 3. Start with Lower Levels
For mobile devices, start with levels 1-5 to ensure smooth performance.

### 4. Cache States for Undo
Use `cloneState()` to save game snapshots:

```typescript
const history: GameState[] = [];
history.push(cloneState(currentState));

// Undo
currentState = history.pop();
```

### 5. Time Control for Real-Time Games
Use `maxTimeMs` instead of `maxDepth` for consistent response times:

```typescript
const result = search(state, {
    maxDepth: 99,
    maxTimeMs: 1000  // 1 second per move
});
```

---

## Performance Tips

- **Mobile**: Use `LEVELS[1-3]` for instant response
- **Desktop**: Use `LEVELS[4-8]` for strong play
- **Analysis**: Use custom config with `maxDepth: 10+`
- **Opening**: Always enable `useOpeningBook: true` for faster early game

---

## Error Handling

```typescript
try {
    const result = await engine.findBestMove(state, config);
} catch (error) {
    console.error('Engine error:', error);
    // Fallback to random legal move
    const moves = generateLegalMoves(state);
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
}
```

---

## Support & Contributing

- **Documentation**: See `/docs` folder
- **Issues**: Open on GitHub
- **Tests**: Run `npm test`

---

## License

MIT License - Free to use in commercial and personal projects.
