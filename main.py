from flask import Flask, render_template, request, jsonify
import chess
import random

app = Flask(__name__)

# Store game states (in production, use a proper session/database)
games = {}

def get_simple_ai_move(board, depth=3):
    """Improved AI using minimax with better evaluation"""
    # Piece-square tables for positional evaluation
    PAWN_TABLE = [
        0,  0,  0,  0,  0,  0,  0,  0,
        5, 10, 10, -20, -20, 10, 10,  5,
        5, -5, -10,  0,  0, -10, -5,  5,
        0,  0,  0, 20, 20,  0,  0,  0,
        5,  5, 10, 25, 25, 10,  5,  5,
        10, 10, 20, 30, 30, 20, 10, 10,
        50, 50, 50, 50, 50, 50, 50, 50,
        0,  0,  0,  0,  0,  0,  0,  0
    ]
    
    KNIGHT_TABLE = [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20,  0,  0,  0,  0, -20, -40,
        -30,  0, 10, 15, 15, 10,  0, -30,
        -30,  5, 15, 20, 20, 15,  5, -30,
        -30,  0, 15, 20, 20, 15,  0, -30,
        -30,  5, 10, 15, 15, 10,  5, -30,
        -40, -20,  0,  5,  5,  0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50
    ]
    
    def evaluate_board(board):
        """Improved evaluation with positional and material factors"""
        if board.is_checkmate():
            return -10000 if board.turn else 10000
        if board.is_stalemate() or board.is_insufficient_material():
            return 0
        
        # Material values
        piece_values = {
            chess.PAWN: 100,
            chess.ROOK: 500,
            chess.KNIGHT: 320,
            chess.BISHOP: 330,
            chess.QUEEN: 900,
            chess.KING: 20000
        }
        
        score = 0
        
        # Material and positional evaluation
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece:
                row = square // 8
                col = square % 8
                square_index = square if piece.color == chess.WHITE else 63 - square
                
                # Material value
                value = piece_values[piece.piece_type]
                
                # Positional bonuses
                if piece.piece_type == chess.PAWN:
                    value += PAWN_TABLE[square_index]
                elif piece.piece_type == chess.KNIGHT:
                    value += KNIGHT_TABLE[square_index]
                
                # Mobility bonus (simplified - count squares controlled)
                # This is a simplified version; full mobility would require checking all possible moves
                value += 5  # Small base mobility bonus
                
                if piece.color == chess.WHITE:
                    score += value
                else:
                    score -= value
        
        # Center control bonus
        center_squares = [chess.D4, chess.D5, chess.E4, chess.E5]
        for square in center_squares:
            if board.piece_at(square):
                piece = board.piece_at(square)
                if piece.color == chess.WHITE:
                    score += 10
                else:
                    score -= 10
        
        # Check bonus
        if board.is_check():
            if board.turn == chess.WHITE:
                score -= 50
            else:
                score += 50
        
        return score
    
    def minimax(board, depth, alpha, beta, maximizing):
        if depth == 0 or board.is_game_over():
            return evaluate_board(board)
        
        if maximizing:
            max_eval = float('-inf')
            for move in board.legal_moves:
                board.push(move)
                eval_score = minimax(board, depth - 1, alpha, beta, False)
                board.pop()
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in board.legal_moves:
                board.push(move)
                eval_score = minimax(board, depth - 1, alpha, beta, True)
                board.pop()
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval
    
    best_move = None
    best_value = float('-inf') if board.turn == chess.WHITE else float('inf')
    
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        return None
    
    # For faster response, use a simpler approach for depth 1
    if depth == 1:
        for move in legal_moves:
            board.push(move)
            eval_score = evaluate_board(board)
            board.pop()
            if board.turn == chess.WHITE:
                if eval_score > best_value:
                    best_value = eval_score
                    best_move = move
            else:
                if eval_score < best_value:
                    best_value = eval_score
                    best_move = move
    else:
        for move in legal_moves:
            board.push(move)
            eval_score = minimax(board, depth - 1, float('-inf'), float('inf'), board.turn == chess.BLACK)
            board.pop()
            if board.turn == chess.WHITE:
                if eval_score > best_value:
                    best_value = eval_score
                    best_move = move
            else:
                if eval_score < best_value:
                    best_value = eval_score
                    best_move = move
    
    return best_move if best_move else random.choice(legal_moves)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/new_game', methods=['POST'])
def new_game():
    """Initialize a new game"""
    game_id = request.json.get('game_id', 'default')
    board = chess.Board()
    games[game_id] = board
    return jsonify({
        'fen': board.fen(),
        'is_game_over': board.is_game_over(),
        'turn': 'white' if board.turn == chess.WHITE else 'black'
    })

@app.route('/api/move', methods=['POST'])
def make_move():
    """Make a human move"""
    data = request.json
    game_id = data.get('game_id', 'default')
    from_square = data.get('from')
    to_square = data.get('to')
    
    if game_id not in games:
        games[game_id] = chess.Board()
    
    board = games[game_id]
    
    try:
        move = chess.Move.from_uci(f"{from_square}{to_square}")
        if move in board.legal_moves:
            board.push(move)
            
            result = {
                'success': True,
                'fen': board.fen(),
                'move': move.uci(),
                'is_game_over': board.is_game_over(),
                'turn': 'white' if board.turn == chess.WHITE else 'black'
            }
            
            if board.is_checkmate():
                result['game_result'] = 'checkmate'
                result['winner'] = 'white' if board.turn == chess.BLACK else 'black'
            elif board.is_stalemate():
                result['game_result'] = 'stalemate'
            elif board.is_insufficient_material():
                result['game_result'] = 'insufficient_material'
            elif board.is_seventyfive_moves():
                result['game_result'] = 'seventyfive_moves'
            elif board.is_fivefold_repetition():
                result['game_result'] = 'fivefold_repetition'
            
            return jsonify(result)
        else:
            return jsonify({'success': False, 'error': 'Illegal move'}), 400
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/computer_move', methods=['POST'])
def computer_move():
    """Get computer's move"""
    data = request.json
    game_id = data.get('game_id', 'default')
    
    if game_id not in games:
        games[game_id] = chess.Board()
    
    board = games[game_id]
    
    if board.is_game_over():
        return jsonify({
            'success': False,
            'error': 'Game is over',
            'fen': board.fen(),
            'is_game_over': True
        })
    
    # Get AI move (depth 3 for better play, can increase to 4 for stronger but slower)
    ai_move = get_simple_ai_move(board, depth=3)
    
    if ai_move:
        board.push(ai_move)
        
        result = {
            'success': True,
            'fen': board.fen(),
            'move': ai_move.uci(),
            'is_game_over': board.is_game_over(),
            'turn': 'white' if board.turn == chess.WHITE else 'black'
        }
        
        if board.is_checkmate():
            result['game_result'] = 'checkmate'
            result['winner'] = 'white' if board.turn == chess.BLACK else 'black'
        elif board.is_stalemate():
            result['game_result'] = 'stalemate'
        elif board.is_insufficient_material():
            result['game_result'] = 'insufficient_material'
        
        return jsonify(result)
    else:
        return jsonify({'success': False, 'error': 'No legal moves'}), 400

@app.route('/api/board_state', methods=['GET'])
def get_board_state():
    """Get current board state"""
    game_id = request.args.get('game_id', 'default')
    
    if game_id not in games:
        games[game_id] = chess.Board()
    
    board = games[game_id]
    
    return jsonify({
        'fen': board.fen(),
        'is_game_over': board.is_game_over(),
        'turn': 'white' if board.turn == chess.WHITE else 'black'
    })

if __name__ == '__main__':
    import os
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=debug, host=host, port=port)
