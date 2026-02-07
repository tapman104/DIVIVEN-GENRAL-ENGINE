import { analyzeGame } from './src/engine/analysis';
import { parseFEN } from './src/engine/board';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Mock history (Scholar's Mate)
// 1. e4 e5
// 2. Qh5 Nc6
// 3. Bc4 Nf6?? (Blunder)
// 4. Qxf7# 

const history = [
    { move: { from: { rank: 6, file: 4 }, to: { rank: 4, file: 4 }, piece: { type: 'p', color: 'w' } }, san: 'e4' }, // e4
    { move: { from: { rank: 1, file: 4 }, to: { rank: 3, file: 4 }, piece: { type: 'p', color: 'b' } }, san: 'e5' }, // e5
    { move: { from: { rank: 7, file: 3 }, to: { rank: 3, file: 7 }, piece: { type: 'q', color: 'w' } }, san: 'Qh5' }, // Qh5
    { move: { from: { rank: 0, file: 1 }, to: { rank: 2, file: 2 }, piece: { type: 'n', color: 'b' } }, san: 'Nc6' }, // Nc6
    { move: { from: { rank: 7, file: 5 }, to: { rank: 4, file: 2 }, piece: { type: 'b', color: 'w' } }, san: 'Bc4' }, // Bc4
    { move: { from: { rank: 0, file: 6 }, to: { rank: 2, file: 5 }, piece: { type: 'n', color: 'b' } }, san: 'Nf6' }, // Nf6?? Blunder allowing mate
    // White mates, but we Analyze up to here.
];

// Fix types for mock
const mockHistory: any[] = history;

console.log("Starting Analysis...");
const start = performance.now();
const result = analyzeGame(START_FEN, mockHistory);
const end = performance.now();

console.log(`Analysis took ${(end - start).toFixed(2)}ms`);
console.log(`Accuracy: ${result.accuracy.toFixed(1)}%`);
console.log("Summary:", result.summary);
console.log("Moves:");
result.details.forEach(m => {
    console.log(`${m.moveIndex + 1}. ${m.classification} (Diff: ${m.scoreDiff})`);
});

if (result.details[5].classification === 'Blunder' || result.details[5].classification === 'Mistake') {
    console.log("SUCCESS: Detected blunder on move 6 (Nf6)");
} else {
    console.error("FAILURE: Did not detect blunder on move 6");
}
