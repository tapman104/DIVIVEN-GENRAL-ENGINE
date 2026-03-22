export function parsePGN(pgn: string): { headers: Record<string, string>, moves: string[] } {
    const headers: Record<string, string> = {};
    const moves: string[] = [];

    // 1. Extract and remove headers
    const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
    let match;
    while ((match = headerRegex.exec(pgn)) !== null) {
        headers[match[1]] = match[2];
    }
    
    // Remove headers from string to get movetext
    let moveText = pgn.replace(/\[[^\]]*\]/g, "");

    // 2. Remove comments and variations
    moveText = moveText.replace(/\{[^}]*\}/g, "");
    moveText = moveText.replace(/;.*$/gm, ""); // line comments

    // Stripping nested variations: ()
    // Removing the innermost pair iteratively
    let prevMoveText;
    do {
        prevMoveText = moveText;
        moveText = moveText.replace(/\([^)]*\)/g, ""); 
    } while (moveText !== prevMoveText);

    // 3. Tokenize by splitting whitespace
    const tokens = moveText.trim().split(/\s+/);
    const resultItems = ["1-0", "0-1", "1/2-1/2", "*"];

    for (const token of tokens) {
        if (!token) continue;
        
        let sanToken = token;
        
        // Strip out prefixed move numbers like "15." or "15..."
        sanToken = sanToken.replace(/^\d+\.+/, "");
        
        // Strip Numeric Annotation Glyphs like $1, $3
        sanToken = sanToken.replace(/\$\d+/g, "");

        // If the token matches a result marker exactly, or we've reached the end of valid notations
        if (resultItems.includes(token)) {
            continue; // End result hit, ignore it
        }

        if (sanToken.length > 0) {
            moves.push(sanToken);
        }
    }

    return { headers, moves };
}
