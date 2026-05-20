"""
Routes Package
"""
from .auth import auth_bp
from .saves import saves_bp
from .leaderboard import leaderboard_bp

__all__ = ['auth_bp', 'saves_bp', 'leaderboard_bp']
