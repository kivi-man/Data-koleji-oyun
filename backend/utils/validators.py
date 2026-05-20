"""
Input Validators
"""
import re


def validate_username(username):
    """
    Validate username
    - 3-20 characters
    - Alphanumeric and underscores only
    """
    if not username or len(username) < 3 or len(username) > 20:
        return False, "Username must be 3-20 characters"
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    
    return True, ""


def validate_email(email):
    """
    Validate email format
    """
    if not email:
        return False, "Email is required"
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Invalid email format"
    
    return True, ""


def validate_password(password):
    """
    Validate password strength
    - At least 6 characters
    """
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters"
    
    return True, ""


def validate_save_data(data):
    """
    Validate save game data
    """
    required_fields = ['x', 'y', 'health', 'scene']
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    # Validate types
    try:
        float(data['x'])
        float(data['y'])
        int(data['health'])
    except (ValueError, TypeError):
        return False, "Invalid data types for x, y, or health"
    
    if not isinstance(data['scene'], str):
        return False, "Scene must be a string"
    
    return True, ""


def validate_score_data(data):
    """
    Validate leaderboard score data
    """
    required_fields = ['score', 'playtime', 'enemies_defeated', 'scenes_completed']
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    # Validate types and ranges
    try:
        score = int(data['score'])
        playtime = int(data['playtime'])
        enemies = int(data['enemies_defeated'])
        scenes = int(data['scenes_completed'])
        
        if score < 0 or playtime < 0 or enemies < 0 or scenes < 0:
            return False, "Values cannot be negative"
    except (ValueError, TypeError):
        return False, "Invalid data types"
    
    return True, ""
