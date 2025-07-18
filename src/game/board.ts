import { batch, cycle, zip } from 'iter-tools';

export type Stone = 'b' | 'w' | '_';
export type Color = 'black' | 'white';

export class Board {
    static readonly SIZE = 4;

    private content: Stone[][];

    private constructor(content: Stone[][]) {
        this.content = content;
    }

    static empty(): Board {
        return new Board(Array.from(
            { length: Board.SIZE },
            () => Array(Board.SIZE).fill('_'))
        );
    }

    static fromString(board_string: string): Board {
        const re = /^[bw_]{16}$/;
        if (!re.test(board_string)) {
            throw new Error("Wrong board string format");
        }

        return new Board(Array.from(batch(
            Board.SIZE,
            board_string.split('').map(c => c as Stone),
        ), row => Array.from(row)));
    }

    static initial(): Board {
        return Board.fromString('wwww________bbbb');
    }

    toString(): string {
        return this.content.flat().map(c => c as string).join('');
    }

    rows(): readonly (readonly Stone[])[] { return this.content; }
    stones(): readonly Stone[] { return this.content.flat(); }

    isValidPosition([row, col]: Pos): boolean {
        return (0 <= row && row < Board.SIZE) && (0 <= col && col < Board.SIZE);
    }

    empty([row, col]: Pos): boolean {
        return this.content[row][col] === '_';
    }
    at([row, col]: Pos): Stone {
        return this.content[row][col];
    }
    place([row, col]: Pos, stone: Stone) { this.content[row][col] = stone; }

    owns(stone: Stone, player: Color): boolean {
        switch (stone) {
            case 'w': return player === 'white';
            case 'b': return player === 'black';
            case '_': return false;
        }
    }

    isValidPassive(src: Pos, vector: Vector, player: Color): boolean {
        return this.owns(this.at(src), player) && vector.visited(src).every(
            pos => this.isValidPosition(pos) && this.empty(pos)
        );
    }

    isValidAggressive(src: Pos, vector: Vector, player: Color): boolean {
        const source = this.at(src);
        if (!this.owns(source, player)) {
            return false;
        }

        const visited = vector.visited(src);
        if (!visited.every(pos => this.isValidPosition(pos))) {
            return false;
        }

        const after = vector.after(src);
        if (this.isValidPosition(after)) {
            visited.push(after);
        }
        const stones = visited.map(pos => this.at(pos));

        const oppositeCount = stones.filter(stone => stone !== source && stone !== '_').length;
        const allyCount = stones.filter(stone => stone === source).length;

        return oppositeCount <= 1 && allyCount === 0;
    }

    pushStone(src: Pos, vector: Vector) {
        console.log(src, vector);
        
        const stone = this.at(src);
        console.log(stone)
        
        this.place(src, '_');

        console.log(this.content);


        const visited = vector.visited(src);
        const after = vector.after(src);

        const opponent = visited
            .map(pos => this.at(pos))
            .reduce((acc, stone) => acc == '_' ? stone : acc, '_');



        if (this.isValidPosition(after) && opponent !== '_') {
            this.place(after, opponent);
        }

        visited.forEach(pos => this.place(pos, '_'));
        this.place(vector.apply(src), stone);
    }

    isTerminal(): boolean {
        const whiteCount = this.stones().filter(stone => stone === 'w').length;
        const blackCount = this.stones().filter(stone => stone === 'b').length;
        return whiteCount === 0 || blackCount === 0;
    }
}


export class ShobuGame {
    static readonly NUM_ROWS = 2;
    static readonly NUM_COLS = 2;
    static readonly NUM_BOARDS = 4;

    private boards: Board[];
    public currentPlayer: Color;

    private constructor(boards: Board[], currentPlayer: Color) {
        this.boards = boards;
        this.currentPlayer = currentPlayer;
    }

    static initial(): ShobuGame {
        return new ShobuGame(Array.from(
            { length: ShobuGame.NUM_BOARDS },
            () => Board.initial(),
        ), 'black');
    }

    getBoards(): readonly [Color, Board][] {
        return Array.from(zip(cycle(['black', 'white']), this.boards));
    }


    isValid(move: Move): boolean {
        return this.boards[move.passive.boardIndex].isValidPassive(move.passive.position, move.vector, this.currentPlayer) &&
            this.boards[move.aggressive.boardIndex].isValidAggressive(move.aggressive.position, move.vector, this.currentPlayer);
    }

    makeMove(move: Move) {
        if (this.boards[move.passive.boardIndex].isValidPassive(move.passive.position, move.vector, this.currentPlayer)) {
            console.log('Valid passive');
        }
        if (this.boards[move.aggressive.boardIndex].isValidAggressive(move.aggressive.position, move.vector, this.currentPlayer)) {
            console.log('Valid aggressive');
        }

        if (!this.isValid(move)) {
            throw new Error("trying to make invalid move");
        }
        this.boards[move.passive.boardIndex].pushStone(move.passive.position, move.vector);
        this.boards[move.aggressive.boardIndex].pushStone(move.aggressive.position, move.vector);
        this.currentPlayer = (this.currentPlayer === 'black') ? 'white' : 'black';
    }

    static fromString(shobu_string: string): ShobuGame {
        const parts = shobu_string.split(' ');
        return new ShobuGame(
            parts.slice(1).map(s => Board.fromString(s)),
            (parts[0] === 'w' ? 'white' : 'black') as Color
        );
    }

    toString(): string {
        return [this.currentPlayer[0] as string, ...this.boards.map(board => board.toString())].join(' ');
    }

    isTerminal(): boolean {
        return this.boards.some(board => board.isTerminal());
    }
}


type Direction = 'U' | 'UR' | 'R' | 'DR' | 'D' | 'DL' | 'L' | 'UL';
type Pos = [number, number];

class Vector {
    private shift: [number, number];
    private length: number;

    private static parseDircetion(direction: Direction): [number, number] {
        switch (direction) {
            case 'U': return [-1, 0];
            case 'UR': return [-1, +1];
            case 'R': return [0, +1];
            case 'DR': return [+1, +1];
            case 'D': return [+1, 0];
            case 'DL': return [+1, -1];
            case 'L': return [0, -1];
            case 'UL': return [-1, -1];
        }
    }

    constructor(length: number, direction: Direction) {
        this.length = length;
        this.shift = Vector.parseDircetion(direction);
    }

    private shiftOnce([row, col]: Pos): Pos {
        const [drow, dcol] = this.shift;
        return [row + drow, col + dcol];
    }

    apply(src: Pos): Pos {
        switch (this.length) {
            case 1: return this.shiftOnce(src);
            case 2: return this.shiftOnce(this.shiftOnce(src));
            default: return src;
        }
    }

    after(src: Pos) {
        return this.shiftOnce(this.apply(src));
    }

    visited(src: Pos): Pos[] {
        switch (this.length) {
            case 1: return [this.shiftOnce(src)];
            case 2: return [this.shiftOnce(src), this.shiftOnce(this.shiftOnce(src))];
        }
        return [];
    }
}

class Location {
    public boardIndex: number;
    public position: Pos;

    constructor(boardIndex: number, position: Pos) {
        this.boardIndex = boardIndex;
        this.position = position;
    }
}

export class Move {
    public vector: Vector;
    public passive: Location;
    public aggressive: Location;

    private constructor(vector: Vector, passive: Location, aggressive: Location) {
        this.vector = vector;
        this.passive = passive;
        this.aggressive = aggressive;
    }

    static fromString(player: Color, move_string: string): Move {
        const re = /^(1|2)(U|UR|R|DR|D|DL|L|UL)(w|b)(\d+)(h|f)(\d+)$/;
        const match = move_string.match(re); 
        if (!match) {
            throw new Error("Wrong move format");
        }

        const parseIdx = function (s: string): [number, number] {
            const index = parseInt(s);
            if (index < 0 || index > 15) {
                throw new Error("Wrong board index provided");
            }
            return [Math.floor(index / Board.SIZE), index % Board.SIZE];
        }

        const [_, 
            length,
            direction,
            passiveLoc,
            passiveIdx,
            aggressiveLoc,
            aggressiveIdx,
        ] = match;

        const baseIdx = (player === 'black') ? 2 : 0;
        const passiveBoardIdx = baseIdx ^ (passiveLoc === 'w' ? 1 : 0);
        const aggressiveBoardIdx = passiveBoardIdx ^ (aggressiveLoc === 'h' ? 1 : 3);

        return new Move(
            new Vector(parseInt(length), direction as Direction),
            new Location(passiveBoardIdx, parseIdx(passiveIdx)),
            new Location(aggressiveBoardIdx, parseIdx(aggressiveIdx)),
        );
    }
}