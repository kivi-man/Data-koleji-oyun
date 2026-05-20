"""
Leaderboard Routes
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import desc
from models import db, Leaderboard, User
from utils.validators import validate_score_data
from middleware.auth import jwt_required_custom, optional_jwt

leaderboard_bp = Blueprint('leaderboard', __name__, url_prefix='/api/leaderboard')


@leaderboard_bp.route('', methods=['GET'])
@optional_jwt
def get_leaderboard(user):
    """Get top scores from leaderboard"""
    try:
        # Get query parameters
        sort_by = request.args.get('sort_by', 'score')
        limit = min(int(request.args.get('limit', 100)), 100)  # Max 100
        
        # Validate sort_by
        valid_sorts = ['score', 'playtime', 'enemies_defeated', 'scenes_completed']
        if sort_by not in valid_sorts:
            sort_by = 'score'
        
        # Build query
        query = Leaderboard.query.join(User)
        
        # Sort
        if sort_by == 'score':
            query = query.order_by(desc(Leaderboard.score))
        elif sort_by == 'playtime':
            query = query.order_by(desc(Leaderboard.playtime))
        elif sort_by == 'enemies_defeated':
            query = query.order_by(desc(Leaderboard.enemies_defeated))
        elif sort_by == 'scenes_completed':
            query = query.order_by(desc(Leaderboard.scenes_completed))
        
        # Get entries
        entries = query.limit(limit).all()
        
        # Format response with rank
        leaderboard = []
        for rank, entry in enumerate(entries, start=1):
            entry_dict = entry.to_dict(include_user=True)
            entry_dict['rank'] = rank
            leaderboard.append(entry_dict)
        
        return jsonify({
            'leaderboard': leaderboard,
            'sort_by': sort_by,
            'total': len(leaderboard)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@leaderboard_bp.route('', methods=['POST'])
@jwt_required_custom
def submit_score(user):
    """Submit a new score to leaderboard"""
    try:
        data = request.get_json()
        
        # Validate score data
        valid, msg = validate_score_data(data)
        if not valid:
            return jsonify({'error': msg}), 400
        
        # Create leaderboard entry
        entry = Leaderboard(
            user_id=user.id,
            score=int(data['score']),
            playtime=int(data['playtime']),
            enemies_defeated=int(data['enemies_defeated']),
            scenes_completed=int(data['scenes_completed'])
        )
        
        db.session.add(entry)
        db.session.commit()
        
        # Get user's rank
        rank = Leaderboard.query.filter(Leaderboard.score > entry.score).count() + 1
        
        return jsonify({
            'message': 'Score submitted successfully',
            'entry_id': entry.id,
            'rank': rank,
            'entry': entry.to_dict(include_user=True)
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@leaderboard_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_rank(user_id):
    """Get user's best rank and scores"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's best entry
        best_entry = Leaderboard.query.filter_by(user_id=user_id).order_by(desc(Leaderboard.score)).first()
        
        if not best_entry:
            return jsonify({
                'user_id': user_id,
                'username': user.username,
                'has_entries': False
            }), 200
        
        # Calculate rank
        rank = Leaderboard.query.filter(Leaderboard.score > best_entry.score).count() + 1
        
        # Get all user entries
        all_entries = Leaderboard.query.filter_by(user_id=user_id).order_by(desc(Leaderboard.created_at)).all()
        
        return jsonify({
            'user_id': user_id,
            'username': user.username,
            'has_entries': True,
            'best_rank': rank,
            'best_entry': best_entry.to_dict(include_user=False),
            'total_entries': len(all_entries),
            'recent_entries': [e.to_dict(include_user=False) for e in all_entries[:5]]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@leaderboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get global leaderboard statistics"""
    try:
        total_entries = Leaderboard.query.count()
        total_users = db.session.query(Leaderboard.user_id).distinct().count()
        
        # Get highest scores
        highest_score = db.session.query(db.func.max(Leaderboard.score)).scalar() or 0
        total_playtime = db.session.query(db.func.sum(Leaderboard.playtime)).scalar() or 0
        total_enemies = db.session.query(db.func.sum(Leaderboard.enemies_defeated)).scalar() or 0
        
        return jsonify({
            'total_entries': total_entries,
            'total_players': total_users,
            'highest_score': highest_score,
            'total_playtime_hours': round(total_playtime / 3600, 2),
            'total_enemies_defeated': total_enemies
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
