"""
Flask Application with Ngrok Support
Data Agents Backend Server & Frontend Server
"""
import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import configuration
from config import config

# Import models
from models import db, bcrypt

# Import routes
from routes import auth_bp, saves_bp, leaderboard_bp


def create_app(config_name='default'):
    """Application factory"""
    # Initialize Flask with static folder pointing to parent directory
    # This allows serving the game files from the root directory
    app = Flask(__name__, static_folder='../', static_url_path='')
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'])
    JWTManager(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(saves_bp)
    app.register_blueprint(leaderboard_bp)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Serve index.html for root route
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')
    
    # Serve static files explicitly (if needed for some environments)
    @app.route('/<path:path>')
    def serve_static(path):
        return send_from_directory(app.static_folder, path)
    
    # API Root
    @app.route('/api')
    def api_root():
        return jsonify({
            'message': 'Data Agents API Server',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'saves': '/api/saves',
                'leaderboard': '/api/leaderboard'
            }
        })
    
    # Health check
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy'}), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        # If path not found in API, try serving index.html (SPA fallback) or return 404
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Endpoint not found'}), 404
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app


def start_ngrok(app):
    """Start ngrok tunnel"""
    try:
        from pyngrok import ngrok, conf
        
        # Get ngrok auth token
        auth_token = os.getenv('NGROK_AUTH_TOKEN')
        if auth_token:
            conf.get_default().auth_token = auth_token
        
        # Start tunnel
        port = 5000
        public_url = ngrok.connect(port, bind_tls=True)
        
        print("\n" + "="*60)
        print("🌐 NGROK TUNNEL STARTED")
        print("="*60)
        print(f"Public URL: {public_url}")
        print(f"Local URL:  http://127.0.0.1:{port}")
        print("="*60 + "\n")
        
        # Update CORS to include ngrok URL
        ngrok_url = str(public_url)
        if ngrok_url not in app.config['CORS_ORIGINS']:
            app.config['CORS_ORIGINS'].append(ngrok_url)
        
        return public_url
    
    except Exception as e:
        print(f"⚠️  Ngrok failed to start: {e}")
        print("Continuing with local server only...")
        return None


if __name__ == '__main__':
    # Get environment
    env = os.getenv('FLASK_ENV', 'development')
    
    # Create app
    app = create_app(env)
    
    # Start ngrok if enabled
    use_ngrok = os.getenv('USE_NGROK', 'false').lower() == 'true'
    if use_ngrok:
        start_ngrok(app)
    
    # Run server
    print("\n" + "="*60)
    print("🚀 DATA AGENTS GAME SERVER")
    print("="*60)
    print(f"Environment: {env}")
    print(f"Local URL:   http://127.0.0.1:5000")
    print(f"Ngrok:       {'Enabled' if use_ngrok else 'Disabled'}")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=(env == 'development')
    )
