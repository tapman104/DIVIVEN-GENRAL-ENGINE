import { GM_BOOK } from './gm_book';

export interface OpeningMove {
    from: string;
    to: string;
}

/**
 * Enhanced opening book logic with weighted move selection.
 */
export function getBookMove(fen: string): string | null {
    // 1. Normalize FEN (remove move clocks)
    const components = fen.split(' ');
    // board turn castling ep
    const normalizedFen = components.slice(0, 4).join(' ');

    const entries = GM_BOOK[normalizedFen];
    if (!entries || entries.length === 0) return null;

    // 2. Weighted Random Selection
    const totalWeight = entries.reduce((sum, e) => sum + e.w, 0);
    let random = Math.random() * totalWeight;

    for (const entry of entries) {
        random -= entry.w;
        if (random <= 0) return entry.m;
    }

    return entries[0].m;
}
