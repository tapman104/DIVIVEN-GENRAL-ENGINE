export type Result = "1-0" | "0-1" | "1/2-1/2" | "*";

export function stringifyPGN(headers: Record<string, string>, moves: string[], result: Result): string {
    let pgn = "";

    // 1. Stringify headers
    for (const [key, value] of Object.entries(headers)) {
        pgn += `[${key} "${value}"]\n`;
    }
    pgn += "\n";

    // 2. Stringify moves
    const tokens: string[] = [];
    for (let i = 0; i < moves.length; i++) {
        const moveNumber = Math.floor(i / 2) + 1;
        if (i % 2 === 0) {
            tokens.push(`${moveNumber}. ${moves[i]}`);
        } else {
            tokens.push(moves[i]);
        }
    }
    tokens.push(result);

    // Word wrap move text to max 80 characters without splitting tokens
    const lines = [];
    let currentLine = "";
    
    for (const token of tokens) {
        if (currentLine.length + token.length > 79) {
            lines.push(currentLine.trim());
            currentLine = token + " ";
        } else {
            currentLine += token + " ";
        }
    }
    if (currentLine.trim().length > 0) {
        lines.push(currentLine.trim());
    }

    pgn += lines.join("\n") + "\n";

    return pgn;
}
