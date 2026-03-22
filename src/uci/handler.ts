import * as readline from 'readline';
import { GameState } from '../types.js';
import { parseFEN, applyMove } from '../board.js';
import { search, SearchConfig, tt as engineTT, SearchController } from '../search.js';
import { uciToMove, moveToUci } from '../notation/uciMove.js';
import { clearHeuristics } from '../ordering.js';

export class UCIHandler {
    private state: GameState;
    private controller: SearchController | null = null;
    private startPosFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    constructor() {
        this.state = parseFEN(this.startPosFEN);
    }

    start() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        rl.on('line', (line) => {
            const command = line.trim();
            if (command) {
                this.handleCommand(command);
            }
        });
    }

    handleCommand(cmd: string) {
        const tokens = cmd.split(/\s+/);
        const command = tokens[0].toLowerCase();

        switch (command) {
            case 'uci':
                console.log("id name DIVIVEN");
                console.log("id author tapman");
                console.log("uciok");
                break;

            case 'isready':
                console.log("readyok");
                break;

            case 'ucinewgame':
                engineTT.clear();
                clearHeuristics();
                break;

            case 'position':
                this.handlePosition(tokens.slice(1));
                break;

            case 'go':
                this.handleGo(tokens.slice(1));
                break;

            case 'stop':
                if (this.controller) {
                    this.controller.stop();
                }
                break;

            case 'quit':
                process.exit(0);
                break;
        }
    }

    private handlePosition(args: string[]) {
        let movesIndex = -1;

        if (args[0] === 'startpos') {
            this.state = parseFEN(this.startPosFEN);
            movesIndex = args.indexOf('moves');
        } else if (args[0] === 'fen') {
            movesIndex = args.indexOf('moves');
            const fenEnd = movesIndex !== -1 ? movesIndex : args.length;
            const fenStr = args.slice(1, fenEnd).join(' ');
            try {
                this.state = parseFEN(fenStr);
            } catch (e) {
                // Ignore invalid FEN based on UCI protocol robustness recommendations
            }
        }

        if (movesIndex !== -1) {
            for (let i = movesIndex + 1; i < args.length; i++) {
                try {
                    const moveStr = args[i];
                    const move = uciToMove(this.state, moveStr);
                    this.state = applyMove(this.state, move);
                } catch (e) {
                    // Stop applying on invalid move
                    break;
                }
            }
        }
    }

    private handleGo(args: string[]) {
        let config: SearchConfig = {};
        let wtime = 0, btime = 0, winc = 0, binc = 0, movestogo = 40;

        for (let i = 0; i < args.length; i++) {
            if (args[i] === 'depth' && i + 1 < args.length) config.maxDepth = parseInt(args[i + 1], 10);
            if (args[i] === 'movetime' && i + 1 < args.length) config.maxTimeMs = parseInt(args[i + 1], 10);
            if (args[i] === 'wtime' && i + 1 < args.length) wtime = parseInt(args[i + 1], 10);
            if (args[i] === 'btime' && i + 1 < args.length) btime = parseInt(args[i + 1], 10);
            if (args[i] === 'winc' && i + 1 < args.length) winc = parseInt(args[i + 1], 10);
            if (args[i] === 'binc' && i + 1 < args.length) binc = parseInt(args[i + 1], 10);
            if (args[i] === 'movestogo' && i + 1 < args.length) movestogo = parseInt(args[i + 1], 10);
        }

        // Add basic UCI time management by calculating optimal move time using wtime, btime, increments
        if (!config.maxTimeMs && (wtime > 0 || btime > 0)) {
            const timeRemaining = this.state.turn === 'w' ? wtime : btime;
            const inc = this.state.turn === 'w' ? winc : binc;
            config.maxTimeMs = Math.floor(timeRemaining / movestogo) + inc - 50; // 50ms safety buffer
            if (config.maxTimeMs < 100) config.maxTimeMs = 100; // avoid forfeits on zero bounds
        }

        // Stream continuous UCI info output
        config.onInfo = (info) => {
            const pvStr = info.pv.map(moveToUci).join(' ');
            const scoreStr = info.scoreMate !== undefined ? `mate ${info.scoreMate}` : `cp ${info.scoreCp}`;
            console.log(`info depth ${info.depth} score ${scoreStr} nodes ${info.nodes} time ${info.time} pv ${pvStr}`);
        };

        this.controller = new SearchController();
        
        // Defer execution to clear current synchronous call stack and run computation
        setImmediate(() => {
            try {
                // All SAN and UCI parsed moves were already strictly verified in handleCommand using uciToMove
                const result = search(this.state, config, this.controller!);
                if (result.move) {
                    console.log(`bestmove ${moveToUci(result.move)}`);
                } else {
                    console.log(`bestmove 0000`); // null move indicator
                }
            } catch (error) {
                // Implement global error handling layer to catch exceptions
                console.log(`info string Engine crashed during search: ${(error as Error).message}`);
                console.log(`bestmove 0000`);
            }
        });
    }
}
