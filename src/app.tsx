import { useState } from 'preact/hooks';
import whitePawn from './assets/white_border.svg';
import blackPawn from './assets/black_border.svg';

import { Board, ShobuGame, Move, type Color, } from './game/board';
import './app.css'
import { makeBotMove, type BotMoveResponse } from './bot';

function renderBoard(board: Board, color: Color) {
  const boardClass = color === 'black' ? 'board dark' : 'board light';

  return (
    <div class={boardClass} style={{
      gridTemplateRows: `repeat(${Board.SIZE}, 1fr)`,
      gridTemplateColumns: `repeat(${Board.SIZE}, 1fr)`,
    }}>
      {board.stones().map((stone, index) => {

        let pieceImg = null;
        if (stone === 'w') pieceImg = whitePawn;
        if (stone === 'b') pieceImg = blackPawn;

        return (
          <div key={index} class="square">
            {pieceImg && <img src={pieceImg} alt="stone" />}
          </div>
        );
      })}
    </div>
  );
}

function renderGame(shobu: ShobuGame) {
  return (
    <div class="game-container">
      <div class="state" style={{
        gridTemplateRows: `repeat(${ShobuGame.NUM_ROWS}, 1fr)`,
        gridTemplateColumns: `repeat(${ShobuGame.NUM_COLS}, 1fr)`,
      }}>
        {shobu.getBoards().map(([color, board]) => renderBoard(board, color))}
      </div>
      <div class="player">
        current player: {shobu.currentPlayer}
      </div>
    </div>
  );
}



export function App() {
  const [shobu, setShobu] = useState<ShobuGame>(ShobuGame.initial());
  const [gameActive, setGameActive] = useState(false);


  const playTurn = async () => {
    setGameActive(true);
    console.log("Starting turn...");
    
    try {
      console.log("Current game state:", shobu.toString());
      
      const botResponse = await makeBotMove(shobu.toString());
      console.log("Bot response:", botResponse);
      
      if (!botResponse.move) {
        throw new Error("No move received from bot");
      }
      
      const move = Move.fromString(shobu.currentPlayer, botResponse.move);
      console.log("Parsed move:", move);
      
      const newShobu = ShobuGame.fromString(shobu.toString());
      console.log("New game state (copy):", newShobu);
      newShobu.makeMove(move);
      console.log("New game state (after move):", newShobu);
      
      setShobu(newShobu);
    } catch (error) {
      console.error("Error during turn:", error);
    } finally {
      setGameActive(false);
    }
  };

  const playGame = async () => {
    while (!shobu.isTerminal()) {
      try {
        playTurn();
        break;
      } catch (e) {
        console.error(e);
        break;
      }
    }
  };



  // Shōbu Bot Tester
  return (
    <div class="app-container">
      <div class="board-container">{renderGame(shobu)}</div>
      <div class="game-status">{gameActive ? "active" : "idle"}</div>
      <button
        onClick={playTurn}
        class="start-btn"
        disabled={gameActive}
      >
        start game
      </button>
    </div>
  );
}
