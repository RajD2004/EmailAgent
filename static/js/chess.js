// Chess game logic - Human vs Computer
const boardSize = 8;
let selectedSquare = null;
let gameOver = false;
let currentFen = '';
let gameId = 'default';
let isPlayerTurn = true;
let isThinking = false;

// Unicode chess pieces
const pieces = {
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
};

// Square names for UCI notation
const squareNames = [];
for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
        const file = String.fromCharCode(97 + col); // a-h
        const rank = 8 - row; // 1-8
        squareNames.push(file + rank);
    }
}

// Initialize game
async function initGame() {
    try {
        const response = await fetch('/api/new_game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ game_id: gameId })
        });
        
        const data = await response.json();
        currentFen = data.fen;
        isPlayerTurn = data.turn === 'white';
        gameOver = data.is_game_over;
        renderBoard();
        updateTurnIndicator();
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('status').textContent = 'Error initializing game';
    }
}

// Parse FEN and render board
function renderBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';
    
    const fenParts = currentFen.split(' ');
    const boardFen = fenParts[0];
    const ranks = boardFen.split('/');
    
    for (let row = 0; row < 8; row++) {
        const rank = ranks[row];
        let col = 0;
        
        for (let char of rank) {
            if (char >= '1' && char <= '8') {
                // Empty squares
                const emptyCount = parseInt(char);
                for (let i = 0; i < emptyCount; i++) {
                    createSquare(row, col, null);
                    col++;
                }
            } else {
                // Piece
                createSquare(row, col, char);
                col++;
            }
        }
    }
}

// Create a square element
function createSquare(row, col, piece) {
    const square = document.createElement('div');
    square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
    square.dataset.row = row;
    square.dataset.col = col;
    square.dataset.square = squareNames[row * 8 + col];
    
    if (piece) {
        square.textContent = pieces[piece] || '';
        square.dataset.piece = piece;
    }
    
    // Always add click listener, but handleSquareClick will check if it's player's turn
    square.addEventListener('click', () => handleSquareClick(row, col));
    
    document.getElementById('chessboard').appendChild(square);
}

// Handle square click
async function handleSquareClick(row, col) {
    if (gameOver || !isPlayerTurn || isThinking) return;
    
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const squareName = square.dataset.square;
    
    // If a square is selected
    if (selectedSquare) {
        const [selectedRow, selectedCol] = selectedSquare;
        const selectedSquareName = document.querySelector(`[data-row="${selectedRow}"][data-col="${selectedCol}"]`).dataset.square;
        
        // If clicking the same square, deselect
        if (selectedRow === row && selectedCol === col) {
            clearSelection();
            return;
        }
        
        // Try to make the move
        const fromSquare = selectedSquareName;
        const toSquare = squareName;
        
        await makeMove(fromSquare, toSquare);
        clearSelection();
    } else {
        // Select a square (only if it's a white piece)
        const piece = square.dataset.piece;
        if (piece && piece === piece.toUpperCase()) { // Uppercase = white
            selectSquare(row, col);
            highlightPossibleMoves(squareName);
        }
    }
}

// Select a square
function selectSquare(row, col) {
    selectedSquare = [row, col];
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    square.classList.add('selected');
}

// Clear selection
function clearSelection() {
    if (selectedSquare) {
        const [row, col] = selectedSquare;
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.remove('selected');
        }
    }
    
    // Remove all possible move highlights
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('possible-move');
    });
    
    selectedSquare = null;
}

// Highlight possible moves (simplified - show all squares as possible)
function highlightPossibleMoves(fromSquare) {
    // In a full implementation, you'd fetch legal moves from the backend
    // For now, we'll just show visual feedback when a piece is selected
    // The backend will validate the move anyway
}

// Make a move
async function makeMove(fromSquare, toSquare) {
    if (isThinking) return;
    
    isThinking = true;
    updateStatus('Thinking...');
    
    try {
        const response = await fetch('/api/move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                game_id: gameId,
                from: fromSquare,
                to: toSquare
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentFen = data.fen;
            gameOver = data.is_game_over;
            renderBoard();
            
            if (data.game_result) {
                handleGameResult(data);
            } else if (!gameOver) {
                // Computer's turn
                isPlayerTurn = false;
                updateTurnIndicator();
                // Small delay before computer moves for better UX
                setTimeout(async () => {
                    await computerMove();
                }, 300);
            } else {
                isPlayerTurn = false;
                updateTurnIndicator();
            }
        } else {
            updateStatus('Invalid move: ' + (data.error || 'Unknown error'));
            isPlayerTurn = true; // Keep it player's turn on invalid move
        }
    } catch (error) {
        console.error('Error making move:', error);
        updateStatus('Error making move');
        isPlayerTurn = true; // Keep it player's turn on error
    } finally {
        isThinking = false;
    }
}

// Computer makes a move
async function computerMove() {
    if (gameOver) return;
    
    updateStatus('Computer is thinking...');
    isThinking = true;
    
    try {
        const response = await fetch('/api/computer_move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ game_id: gameId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentFen = data.fen;
            gameOver = data.is_game_over;
            
            // Highlight the computer's move
            const move = data.move;
            const fromSquare = move.substring(0, 2);
            const toSquare = move.substring(2, 4);
            
            // Update player turn first
            isPlayerTurn = true;
            updateTurnIndicator();
            
            setTimeout(() => {
                renderBoard();
                highlightMove(fromSquare, toSquare);
                
                if (data.game_result) {
                    handleGameResult(data);
                } else {
                    updateStatus('');
                }
            }, 500); // Small delay to show the move
        } else {
            updateStatus('Computer error: ' + (data.error || 'Unknown error'));
            isPlayerTurn = true;
            updateTurnIndicator();
            renderBoard(); // Re-render to enable clicks
        }
    } catch (error) {
        console.error('Error getting computer move:', error);
        updateStatus('Error getting computer move');
        isPlayerTurn = true;
        updateTurnIndicator();
        renderBoard(); // Re-render to enable clicks
    } finally {
        isThinking = false;
    }
}

// Highlight a move
function highlightMove(fromSquare, toSquare) {
    const fromSquareEl = document.querySelector(`[data-square="${fromSquare}"]`);
    const toSquareEl = document.querySelector(`[data-square="${toSquare}"]`);
    
    if (fromSquareEl) {
        fromSquareEl.classList.add('possible-move');
        setTimeout(() => fromSquareEl.classList.remove('possible-move'), 1000);
    }
    if (toSquareEl) {
        toSquareEl.classList.add('possible-move');
        setTimeout(() => toSquareEl.classList.remove('possible-move'), 1000);
    }
}

// Handle game result
function handleGameResult(data) {
    gameOver = true;
    isPlayerTurn = false;
    
    let message = '';
    switch (data.game_result) {
        case 'checkmate':
            message = `Checkmate! ${data.winner === 'white' ? 'You' : 'Computer'} wins!`;
            break;
        case 'stalemate':
            message = 'Stalemate! Game is a draw.';
            break;
        case 'insufficient_material':
            message = 'Draw by insufficient material.';
            break;
        case 'seventyfive_moves':
            message = 'Draw by 75-move rule.';
            break;
        case 'fivefold_repetition':
            message = 'Draw by fivefold repetition.';
            break;
        default:
            message = 'Game over.';
    }
    
    updateStatus(message);
    updateTurnIndicator();
}

// Update turn indicator
function updateTurnIndicator() {
    const turnIndicator = document.getElementById('current-turn');
    if (gameOver) {
        turnIndicator.textContent = 'Game Over';
    } else if (isPlayerTurn) {
        turnIndicator.textContent = "Your Turn (White)";
    } else {
        turnIndicator.textContent = "Computer's Turn (Black)";
    }
}

// Update status message
function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

// Reset game
async function resetGame() {
    selectedSquare = null;
    gameOver = false;
    isPlayerTurn = true;
    isThinking = false;
    updateStatus('');
    await initGame();
}

// Initialize game on load
initGame();
