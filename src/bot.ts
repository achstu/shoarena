// API service to communicate with FastAPI backend
const API_BASE_URL = "http://localhost:3001";

export interface BotMoveResponse {
    move: string;
    error?: string;
}

export async function makeBotMove(
    // botName: string,
    gameState: string
): Promise<BotMoveResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/run-bot`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                game_state: gameState
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to get bot move:", error);
        return { move: "", error: error instanceof Error ? error.message : "Unknown error" };
    }
}