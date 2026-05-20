"""
JWT Authentication Middleware
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models import User


def jwt_required_custom(fn):
    """
    Custom JWT required decorator that returns user object
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return fn(user, *args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 401
    
    return wrapper


def optional_jwt(fn):
    """
    Optional JWT - allows both authenticated and anonymous access
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                user = User.query.get(user_id)
        except:
            pass
        
        return fn(user, *args, **kwargs)
    
    return wrapper
