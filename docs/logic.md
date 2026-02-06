# Logic Documentation

This document explains the core logic behind the Diviven General Engine.

## 1. Move Generation (`movegen.ts`)
The engine uses a pseudo-legal move generation strategy followed by a legality filter.
- **Sliding Pieces:** Rays stop at the first piece hit. Enemy pieces are included as captures; friendly pieces block the ray.
- **Pawns:** Handles single/double pushes, diagonal captures, and En Passant. Promotion is handled for all types ('q', 'r', 'b', 'n').
- **Knights/Kings:** Uses fixed offset arrays for jump/step moves.
- **Castling:** Checks for unmoved pieces, empty paths, and safety of the King's path.

## 2. Legality Filtering (`rules.ts`)
We use an "Apply & Verify" approach:
1. Generate pseudo-legal moves.
2. For each move, simulate it using `applyMove`.
3. Locate the King in the next state.
4. Check if the King's square is attacked by the opponent.
5. If attacked, the move is illegal and discarded.

## 3. Evaluation (`eval.ts`)
The engine scores positions using a static evaluation function:
- **Material:** Pieces are assigned standard weights (P:100, N:320, B:330, R:500, Q:900, K:20000).
- **Positioning:** Piece-Square Tables (PST) adjust scores based on the piece's location (e.g., Knights in the center are worth more than on the rim).

## 4. Search Algorithm (`search.ts`)
- **Negamax:** A simplified version of Minimax that works by negating scores for the opponent.
- **Alpha-Beta Pruning:** Cuts off branches that are objectively worse than previously searched lines.
- **Quiescence Search:** Extends the search at terminal nodes by only looking at captures. This prevents the "horizon effect," where the engine makes a move that looks good but lead to a tactical loss just beyond the depth limit.
- **Mate & Stalemate Detection:** Uses `isCheck` and moves counting to score checkmate as a near-infinite loss/win and stalemate as a 0 (draw).
- **Iterative Deepening:** Searches depth 1, then 2, then 3, allowing for flexible interruption and improved move ordering.
- **Move Ordering:** Prioritizes captures (MVV-LVA) and promotions to help Alpha-Beta find cutoffs faster.
- **Transposition Table:** Caches results of previous searches using Zobrist hashing to avoid redundant computation.
