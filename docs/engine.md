# Engine Reference — Diviven General Engine

This document lists the engine API, configurable parameters, internal defaults, and usage examples for integrating the search/evaluation engine into a UI or automation.

## Quick Links
- Search entry point: [src/search.ts](src/search.ts)
- Worker bridge: [src/bridge.ts](src/bridge.ts)
- Worker entry: [src/chess.worker.ts](src/chess.worker.ts)
- Difficulty presets: [src/levels.ts](src/levels.ts)
- Transposition table: [src/tt.ts](src/tt.ts)
- Evaluation: [src/eval.ts](src/eval.ts)
- Move ordering: [src/ordering.ts](src/ordering.ts)
- Move generation: [src/movegen.ts](src/movegen.ts)

## API Overview

- `search(state: GameState, config: SearchConfig): SearchResult`
  - Runs an iterative-deepening negamax search with alpha-beta pruning and a quiescence fallback.
  - `SearchConfig` fields (all optional):
    - `maxTimeMs?: number` — maximum thinking time in milliseconds (default: `Infinity`).
    - `maxDepth?: number` — maximum search depth for iterative deepening (default: `24`).

- `stopSearch(): void`
  - Cooperative cancellation flag used by the worker and bridge.

- `ChessEngineBridge` (helper for UI)
  - `findBestMove(state: GameState, config: SearchConfig): Promise<SearchResult>` — starts the worker search.
  - `cancelSearch()` — sends a `STOP_SEARCH` message to the worker.

## Data Structures & Defaults

- Transposition Table (TT)
  - Class: `TranspositionTable` in [src/tt.ts](src/tt.ts).
  - Constructor signature: `new TranspositionTable(sizeMB: number)` where `sizeMB` expresses desired memory in megabytes.
  - Default used in the main `search` implementation: `new TranspositionTable(16)` (approx 16MB).
  - Replacement strategy: stores an entry if incoming depth >= existing depth (depth-preferred replacement).

- Difficulty Levels
  - Presets are in [src/levels.ts](src/levels.ts). Each level implements `SearchConfig` plus meta fields:
    - `maxTimeMs`, `maxDepth`, `name`, `description`, and `randomness` (reserved).
  - Examples (see file for full table): Novice (1) → short time & depth; Divine (10) → deep search and longer time.

- Evaluation
  - Material weights and Piece-Square Tables (PST) are defined in [src/eval.ts](src/eval.ts).
  - Material values (score units): P=100, N=320, B=330, R=500, Q=900, K=20000.
  - PSTs are applied for positional adjustments; values are white-positive, mirrored for black.

- Move Ordering
  - Implemented in [src/ordering.ts](src/ordering.ts).
  - Priority heuristics (in decreasing order): promotions, captures (simplified MVV-LVA), checks.

- Move Generation & Legality
  - `movegen.ts` produces pseudo-legal moves; `rules.ts` filters illegal moves by simulating and checking king safety.

## Search Behavior Details

- Iterative Deepening
  - The `search` function performs iterative deepening from depth 1 up to `maxDepth` (or until time limit).
  - After each completed depth the current best move is recorded.

- Time Management
  - `maxTimeMs` is enforced with a 10% safety margin in the current implementation (search stops when elapsed &gt; `maxTimeMs * 0.9`).

- Quiescence Search
  - At leaf nodes (depth == 0) the engine runs `quiescence()` which explores captures only to avoid horizon effects.

- Transposition Table Usage
  - TT lookups occur at the start of `negamax()` and entries are used to adjust alpha/beta or return exact bounds when applicable.

## Configuration Schema (example)

A typical engine configuration object (JSON) used by UI code:

```json
{
  "maxTimeMs": 1500,
  "maxDepth": 6,
  "ttSizeMB": 16,
  "level": 5
}
```

- `ttSizeMB` is not currently exposed through the `bridge` API; to change TT size you can construct your own search runner or modify `src/search.ts`.
- `level` refers to presets in `src/levels.ts` and is a convenience mapping for `maxTimeMs`/`maxDepth`.

## Usage Examples

- Calling `search` directly (for tests or headless integration):

```ts
import { search, stopSearch } from './src/search.js';
import { initialStateFromFEN } from './src/board.js';

const state = initialStateFromFEN('startpos');
const result = search(state, { maxTimeMs: 1000, maxDepth: 5 });
console.log('Best move', result.move, 'score', result.score);
```

- Using the Worker Bridge (recommended for UI):

```ts
import { ChessEngineBridge } from './src/bridge.js';

const bridge = new ChessEngineBridge('/src/chess.worker.js');
bridge.findBestMove(state, { maxTimeMs: 2000, maxDepth: 6 })
  .then(result => console.log('Best move', result.move))
  .catch(err => console.error('Search failed', err));

// To cancel:
bridge.cancelSearch();
```

- Opening book
  - `chess.worker.ts` checks the opening book (via `getBookMove`) before invoking the search and will return a book move immediately if available.

## Tuning Recommendations

- Quick UI responsiveness: use `maxTimeMs` &lt;= 500 and `maxDepth` 2-4 for mobile or low-power devices.
- Balanced play: `maxTimeMs` 1000–3000 and `maxDepth` 4–6.
- Heavy analysis: increase `maxDepth` to 8+ and `ttSizeMB` if you modify the engine to accept it.
- Memory vs speed: larger TT reduces re-searching but increases memory; 16MB is a reasonable default for web usage.

## Extensibility Notes

- Exposing additional `SearchConfig` fields (e.g., `useQuiescence`, `nullMovePruning`, `multiPV`) is straightforward: add fields to `SearchConfig` in [src/search.ts](src/search.ts) and branch the search accordingly.
- For deeper performance work, consider replacing arrays with bitboards and moving hot loops into WebAssembly or WebWorker-optimized code paths.

---

If you want, I can:
- Add a JSON Schema file for the engine config and a small `docs/engine_examples.md` with UCI-like options.
- Update the `ChessEngineBridge` to accept `ttSizeMB` and `level` directly.
Which would you prefer next?