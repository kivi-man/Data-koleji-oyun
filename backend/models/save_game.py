"""
SaveGame Model
"""
from datetime import datetime
from .user import db


class SaveGame(db.Model):
    """Game save model"""
    __tablename__ = 'save_games'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    save_name = db.Column(db.String(100), nullable=False, default='Save 1')
    
    # Game state
    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
    health = db.Column(db.Integer, nullable=False)
    scene = db.Column(db.String(50), nullable=False)
    player_combo = db.Column(db.Integer, default=0)
    player_has_adrenaline = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.Integer, default=0)  # Game time in ms
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'save_name': self.save_name,
            'x': self.x,
            'y': self.y,
            'health': self.health,
            'scene': self.scene,
            'player_combo': self.player_combo,
            'player_has_adrenaline': self.player_has_adrenaline,
            'timestamp': self.timestamp,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f'<SaveGame {self.save_name} - User {self.user_id}>'
