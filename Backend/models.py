from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')
    complaints = db.relationship('Complaint', backref='author', lazy=True)

class Complaint(db.Model):
    __tablename__ = 'complaints'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='Pending')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))


class ComplaintLog(db.Model):

    __tablename__ = 'complaint_logs'
    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(
        db.Integer,
        db.ForeignKey('complaints.id')
    )

    admin_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id')
    )

    old_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50))

    timestamp = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )