"""
Leaderboard Model
"""
from datetime import datetime
from .user import db


class Leaderboard(db.Model):
    """Leaderboard entry model"""
    __tablename__ = 'leaderboard'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Stats
    score = db.Column(db.Integer, nullable=False, default=0, index=True)
    playtime = db.Column(db.Integer, nullable=False, default=0)  # seconds
    enemies_defeated = db.Column(db.Integer, nullable=False, default=0)
    scenes_completed = db.Column(db.Integer, nullable=False, default=0)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self, include_user=True):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'score': self.score,
            'playtime': self.playtime,
            'enemies_defeated': self.enemies_defeated,
            'scenes_completed': self.scenes_completed,
            'created_at': self.created_at.isoformat()
        }
        
        if include_user and self.user:
            data['username'] = self.user.username
        
        return data
    
    def __repr__(self):
        return f'<Leaderboard User {self.user_id} - Score {self.score}>'
