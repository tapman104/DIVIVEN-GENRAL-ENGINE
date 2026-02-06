# Error & Resolution Log

This log documents failures encountered during development and how they were resolved to prevent regression.

## 1. Move Generation Desync
- **Symptoms:** Perft count mismatch for complex positions.
- **Cause:** Ray-based sliding piece logic was not correctly stopping at blocking pieces when cloning the board.
- **Resolution:** Enforced immediate termination of the ray loop upon hitting *any* piece. If the piece is an enemy, the square is added as a capture; if friendly, it is excluded.
- **Rule:** Sliding rays are now strictly bounded by the `board` state.

## 2. Coordinate System Error
- **Symptoms:** Search utility failed to find mate-in-1 in test cases.
- **Cause:** Coordinate mapping in `board.test.ts` had a rank-index mismatch for the `d4` square (rank index was off by 1).
- **Resolution:** Corrected the rank calculation logic in the test suite to match the zero-indexed internal board `(rank: 4, file: 3)`.

## 3. Mutable State Pollution
- **Symptoms:** Perft results varied across multiple runs of the same test.
- **Cause:** State mutation was leaking between recursive calls due to shallow object copies.
- **Resolution:** Implemented a robust `cloneState` utility in `board.ts` that performs deep copies of the board array and the `castlingRights` object.
- **Rule:** `applyMove` now strictly returns a fresh cloned state.

## 4. Castling Legality Violation
- **Symptoms:** King allowed to castle even when the intermediate square was attacked.
- **Cause:** Movegen was only checking for empty squares, not square safety.
- **Resolution:** Integrated `isSquareAttacked` into the castling path check in `movegen.ts`.
- **Refinement Law:** Castling is now gated by King safety on the start, middle, and end squares.

## 5. Evaluation Desync
- **Symptoms:** Evaluator scored a Black advantage as a White advantage.
- **Cause:** The FEN in the test case was incorrectly constructed (missing a white piece), leading to a material imbalance that the test didn't expect.
- **Resolution:** Audit of all test FENs resulted in high-fidelity test cases that properly verify both White and Black advantages.
- **Rule:** Double-check FEN strings against a known-good engine or visualizer before adding to the test suite.

## 6. Stalemate vs Mate Collision
- **Symptoms:** Search returned a score of `-100001` (Mate) for a position expected to be `0` (Stalemate).
- **Cause:** The FEN used in the stalemate unit test was actually a checkmate position (`7k/6Q1/7K/8/8/8/8/8 b - - 0 1`).
- **Resolution:** Corrected the stalemate FEN to `k7/2Q5/K7/8/8/8/8/8 b - - 0 1`, where the Black King is not in check but has no legal moves.
- **Rule:** Use `isCheck` inside the terminal node evaluator to distinguish between tactical defeat (Checkmate) and mathematical draw (Stalemate).
