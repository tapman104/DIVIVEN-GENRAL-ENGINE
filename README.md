# DIVIVEN GENERAL ENGINE ♟️

**High-performance, UI-agnostic chess engine for JavaScript, TypeScript, and Mobile (Native AOT compatible).**

DIVIVEN General Engine is a powerful, embeddable chess engine designed for modern web and mobile applications. It features a sophisticated search algorithm, multi-level difficulty, and a non-blocking asynchronous bridge for seamless integration into React/React Native, Avalonia, or vanilla JS environments.

---

## 🚀 Key Features

-   **Deep Search**: Iterative Deepening Negamax with Alpha-Beta pruning.
-   **Tactical Accuracy**: Quiescence search to handle complex capture sequences.
-   **High Efficiency**: Transposition Table with Zobrist Hashing to avoid redundant analysis.
-   **Adaptive Difficulty**: 10 pre-defined levels ranging from Beginner to Expert.
-   **Mobile Optimized**: Lightweight codebase with Native AOT compatibility.
-   **UI-Agnostic**: Core logic is completely separate from the rendering layer.

---

## 🏗️ Logic & Architecture

### 1. Board Representation
The engine uses an 8x8 array-based board representation. Each square contains a piece object `{ type: PieceType, color: Color }` or `null`. 
- **State Management**: Tracks turn, castling rights, en passant squares, and move clocks (half-move for 50-move rule, full-move for numbering).
- **FEN Compatibility**: Fully supports Forsyth-Edwards Notation (FEN) for importing and exporting game states.

### 2. Move Generation
- **Pseudo-Legal Generation**: Generates all possible moves for the side to move, including castling and en passant.
- **Legality Validation**: Filters pseudo-legal moves by simulating the move and checking if the King is left in check using efficient attack detection.

### 3. Search Algorithm
The engine employs a standard **Iterative Deepening Negamax** search with:
- **Alpha-Beta Pruning**: Significantly reduces the search space by pruning branches that cannot possibly affect the final decision.
- **Quiescence Search**: Extends the search at leaf nodes to only consider captures, preventing the "horizon effect" in tactical positions.
- **Transposition Table (TT)**: Stores previously evaluated positions using **Zobrist Hashing** for instant lookup (16MB default table).

### 4. Evaluation 
The evaluation function uses a combination of:
- **Material Weighting**: Standard values (P:100, N:320, B:330, R:500, Q:900, K:20000).
- **Piece-Square Tables (PST)**: Values for piece placement (e.g., Knights in the center, Pawns on the 7th rank) to encourage positional play.

### 5. Move Ordering
To maximize Alpha-Beta efficiency, moves are ordered by:
1.  **Promotions**
2.  **Captures** (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
3.  **Checks**

---

## 🛠️ Usage & Integration

### Install
```bash
npm install diviven-general-engine
```

### Quick Start (Asynchronous Bridge)
```typescript
import { ChessEngineBridge } from 'diviven-general-engine/src/bridge';
import { parseFEN, LEVELS } from 'diviven-general-engine/src/board';

const engine = new ChessEngineBridge();
const state = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

// Find best move at Medium complexity (Level 5)
const result = await engine.findBestMove(state, LEVELS[5]);
console.log('Best Move:', result.move);
```

### Local Development
To run the project and UI locally:
```bash
# From the project root
npm start
```
This starts the Vite development server in the `ux/` directory.

---

## 📚 API Reference

For detailed function signatures and type definitions, see:
-   [Engine API Reference](docs/api.md)
-   [Architecture Overview](docs/engine.md)
-   [Usage Examples](docs/examples.md)

---

## 📜 License
MIT License. Created by the DIVIVEN Team.
