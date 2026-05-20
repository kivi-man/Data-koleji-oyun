"""
Save/Load Routes
"""
from flask import Blueprint, request, jsonify
from models import db, SaveGame
from utils.validators import validate_save_data
from middleware.auth import jwt_required_custom

saves_bp = Blueprint('saves', __name__, url_prefix='/api/saves')


@saves_bp.route('', methods=['GET'])
@jwt_required_custom
def list_saves(user):
    """List all saves for the current user"""
    try:
        saves = SaveGame.query.filter_by(user_id=user.id).order_by(SaveGame.updated_at.desc()).all()
        
        return jsonify({
            'saves': [save.to_dict() for save in saves]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@saves_bp.route('/<int:save_id>', methods=['GET'])
@jwt_required_custom
def get_save(user, save_id):
    """Get a specific save"""
    try:
        save = SaveGame.query.filter_by(id=save_id, user_id=user.id).first()
        
        if not save:
            return jsonify({'error': 'Save not found'}), 404
        
        return jsonify(save.to_dict()), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@saves_bp.route('', methods=['POST'])
@jwt_required_custom
def create_save(user):
    """Create a new save"""
    try:
        data = request.get_json()
        
        # Validate save data
        valid, msg = validate_save_data(data)
        if not valid:
            return jsonify({'error': msg}), 400
        
        # Create save
        save = SaveGame(
            user_id=user.id,
            save_name=data.get('save_name', 'Save 1'),
            x=float(data['x']),
            y=float(data['y']),
            health=int(data['health']),
            scene=data['scene'],
            player_combo=int(data.get('player_combo', 0)),
            player_has_adrenaline=bool(data.get('player_has_adrenaline', False)),
            timestamp=int(data.get('timestamp', 0))
        )
        
        db.session.add(save)
        db.session.commit()
        
        return jsonify({
            'message': 'Save created successfully',
            'save_id': save.id,
            'save': save.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@saves_bp.route('/<int:save_id>', methods=['PUT'])
@jwt_required_custom
def update_save(user, save_id):
    """Update an existing save"""
    try:
        save = SaveGame.query.filter_by(id=save_id, user_id=user.id).first()
        
        if not save:
            return jsonify({'error': 'Save not found'}), 404
        
        data = request.get_json()
        
        # Validate save data
        valid, msg = validate_save_data(data)
        if not valid:
            return jsonify({'error': msg}), 400
        
        # Update save
        save.save_name = data.get('save_name', save.save_name)
        save.x = float(data['x'])
        save.y = float(data['y'])
        save.health = int(data['health'])
        save.scene = data['scene']
        save.player_combo = int(data.get('player_combo', 0))
        save.player_has_adrenaline = bool(data.get('player_has_adrenaline', False))
        save.timestamp = int(data.get('timestamp', 0))
        
        db.session.commit()
        
        return jsonify({
            'message': 'Save updated successfully',
            'save': save.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@saves_bp.route('/<int:save_id>', methods=['DELETE'])
@jwt_required_custom
def delete_save(user, save_id):
    """Delete a save"""
    try:
        save = SaveGame.query.filter_by(id=save_id, user_id=user.id).first()
        
        if not save:
            return jsonify({'error': 'Save not found'}), 404
        
        db.session.delete(save)
        db.session.commit()
        
        return jsonify({
            'message': 'Save deleted successfully'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
