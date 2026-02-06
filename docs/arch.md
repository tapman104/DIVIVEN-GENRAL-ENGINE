# Architecture Documentation

Diviven General Engine is designed as a modular, typesafe chess engine built with TypeScript.

## Project Structure

```
/src
  ├── types.ts      # Domain models and shared interfaces
  ├── board.ts      # Core board state management and FEN handling
  ├── movegen.ts    # Pseudo-legal move generation
  ├── rules.ts      # Legality filtering and attack detection
  ├── eval.ts       # Static evaluation function
  ├── search.ts     # Minimax / Negamax / Alpha-Beta algorithm
  ├── ordering.ts   # Search heuristics for move prioritization
  ├── zobrist.ts    # Fast hashing for position caching
  ├── tt.ts         # Transposition Table data structure
  ├── bridge.ts     # Main-thread interface for the search worker
  ├── chess.worker.ts # Web Worker entry point for engine logic
  ├── perft.ts      # Technical validation (Move counts)
```

## Data Flow

1. **Input:** The engine accepts a **FEN string** via the `ChessEngineBridge`.
2. **Worker Initialization:** The `Bridge` spawns a `chess.worker.ts` instance.
3. **Search Request:** The main thread calls `bridge.findBestMove()`, which posts a message to the worker.
4. **Search Execution:** The worker runs `negamax` with alpha-beta pruning and iterative deepening.
5. **Move Ordering:** Moves are sorted by `ordering` to maximize pruning.
6. **Caching:** The `TranspositionTable` is checked for existing results.
7. **Interruption:** The bridge can call `bridge.cancelSearch()` to trigger cooperative cancellation via a `shouldStop` flag.
8. **Result:** The worker posts the best move back to the bridge, which resolves the initial promise.

## Key Design Principles

- **Immutability:** Every board update returns a *new* state, ensuring thread safety and simplifying search history/undo.
- **Fail-Fast Testing:** Heavy reliance on Perft counts ensures that movegen bugs are caught immediately.
- **Portable Architecture:** Separating the evaluation and search logic from the board representation allows for future optimizations (like bitboards) without rewriting the "AI" layer.
