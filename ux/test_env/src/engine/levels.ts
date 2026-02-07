import type { SearchConfig } from './search';

export interface DifficultyLevel extends SearchConfig {
    name: string;
    description: string;
    randomness?: number; // Not yet implemented in search, but reserved for Phase 8
}

export const LEVELS: Record<number, DifficultyLevel> = {
    1: { name: 'Blitz - Novice', description: 'Policy-eval only (~5ms)', maxTimeMs: 8, maxDepth: 2, randomness: 0.7 },
    2: { name: 'Blitz - Casual', description: 'Fast micro-search (~8ms)', maxTimeMs: 15, maxDepth: 2, randomness: 0.4 },
    3: { name: 'Blitz - Strong', description: 'Tactical threat detection', maxTimeMs: 25, maxDepth: 3, randomness: 0.2 },
    4: { name: 'Intermediate', description: 'Respectable club player', maxTimeMs: 40, maxDepth: 3, randomness: 0.1 },
    5: { name: 'Advanced', description: 'Strong club player', maxTimeMs: 50, maxDepth: 4, randomness: 0 },
    6: { name: 'Expert', description: 'Very strong, deliberate play. 30ms', maxTimeMs: 30, maxDepth: 4, randomness: 0 },
    7: { name: 'Master', description: 'Near professional level. 35ms', maxTimeMs: 35, maxDepth: 5, randomness: 0 },
    8: { name: 'Grandmaster', description: 'Exceptional strategic depth. 40ms', maxTimeMs: 40, maxDepth: 5, randomness: 0 },
    9: { name: 'Stockfish-Lite', description: 'Max engine strength. 45ms', maxTimeMs: 45, maxDepth: 6, randomness: 0 },
    10: { name: 'Divine', description: 'Adaptive "Divine" mode. 50ms', maxTimeMs: 50, maxDepth: 8, randomness: 0 }
};
