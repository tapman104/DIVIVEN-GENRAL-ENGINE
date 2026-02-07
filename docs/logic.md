# Logic Documentation

This document explains the core logic behind **Divine General Silva / JS Chess Engine**.

## 1. Attack Detection (`attacks.ts`) [NEW]
To break circular dependencies between generation and rules, attack logic was extracted into a dedicated leaf module:
- **Functions:** `isSquareAttacked`, `countAttackers`, `findKing`, `isCheck`.
- **Logic:** Performs ray-casting and offset-checking to determine if a square is under fire.

## 2. Move Generation (`movegen.ts`)
The engine uses a pseudo-legal move generation strategy followed by a legality filter.
- **Sliding Pieces:** Rays stop at the first piece hit. Enemy pieces are included as captures; friendly pieces block the ray.
- **Pawns:** Handles single/double pushes, diagonal captures, and En Passant. Promotion is handled for all types ('q', 'r', 'b', 'n').
- **Knights/Kings:** Uses fixed offset arrays for jump/step moves.
- **Castling:** Checks for unmoved pieces, empty paths, and safety of the King's path. Imports `isSquareAttacked` from `attacks.ts`.

## 3. Legality Filtering (`rules.ts`)
We use an "Apply & Verify" approach:
1. Generate pseudo-legal moves via `movegen.ts`.
2. For each move, simulate it using `applyMove`.
3. Locate the King in the next state.
4. Check if the King's square is attacked using `attacks.ts`.
5. If attacked, the move is illegal and discarded.

## 4. Evaluation (`eval.ts`)
The engine scores positions using a static evaluation function:
- **Material:** Pieces are assigned standard weights (P:100, N:320, B:330, R:500, Q:900, K:20000).
- **Positioning:** Piece-Square Tables (PST) adjust scores based on the piece's location.

## 5. Search Algorithm (`search.ts`)
- **Move Ordering:** Prioritizes captures (MVV-LVA) and promotions.
- **Transposition Table:** Caches results using Zobrist hashing.
- **Quiescence Search:** Extends search for captures to avoid the horizon effect.

## 6. Deployment (`vercel.json`)
The project is optimized for Vercel with SPA routing rewrites to ensure `index.html` handles all navigation.

---
**Last Updated:** 2026-02-08T00:26:50+05:30

