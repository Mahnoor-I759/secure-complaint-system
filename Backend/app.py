from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import Bcrypt
from config import Config
from models import db, User, Complaint, ComplaintLog
from datetime import datetime
import re
import os
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env

app = Flask(__name__)
CORS(app)

# --- SECURITY CONFIGURATION ---
# JWT secret key loaded from environment — never hard-coded
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
if not app.config["JWT_SECRET_KEY"]:
    raise RuntimeError("JWT_SECRET_KEY is not set in environment variables")

app.config['JWT_VERIFY_SUB'] = False
jwt = JWTManager(app)
app.config.from_object(Config)

db.init_app(app)
bcrypt = Bcrypt(app)


# ── Helpers ─────────────────────────────────────────────────

def sanitize_text(value: str) -> str:
    """Strip leading/trailing whitespace and collapse internal runs of
    whitespace to a single space. Returns a clean string."""
    return re.sub(r'\s+', ' ', value.strip())


# ============================================================
# AUTHENTICATION & REGISTRATION
# ============================================================

@app.route('/')
def home():
    return "Complaint System API Running"


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({"message": "All fields are required"}), 400

    email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    if not re.match(email_pattern, email):
        return jsonify({"message": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already registered"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, email=email, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"})


@app.route('/register-admin', methods=['POST'])
def register_admin():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    admin_code = data.get('admin_code')

    # Admin registration code loaded from environment
    SECRET_ADMIN_CODE = os.getenv("ADMIN_SECRET_CODE")
    if not SECRET_ADMIN_CODE:
        return jsonify({"message": "Admin registration is not configured"}), 500

    if admin_code != SECRET_ADMIN_CODE:
        return jsonify({"message": "Invalid admin registration code"}), 403

    if not username or not email or not password:
        return jsonify({"message": "All fields are required"}), 400

    email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    if not re.match(email_pattern, email):
        return jsonify({"message": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already registered"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, email=email, password=hashed_password, role='admin')
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Admin registered successfully"})


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if user and bcrypt.check_password_hash(user.password, password):
        token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Login successful",
            "token": token,
            "role": user.role,
            "username": user.username
        })

    return jsonify({"message": "Invalid email or password"}), 401


# ============================================================
# USER ROUTES
# ============================================================

@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    current_user = get_jwt_identity()
    return jsonify({"message": "Protected data accessed", "user_id": current_user})


@app.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"id": user.id, "username": user.username, "email": user.email, "role": user.role})


@app.route('/complaints', methods=['POST'])
@jwt_required()
def submit_complaint():
    current_user = get_jwt_identity()
    data = request.get_json()

    # ── 1. Accept only the expected fields ──────────────────
    # Any extra keys in the payload (e.g. user_id, status, role) are silently
    # ignored — the complaint is always created for the authenticated user
    # and always starts with the default 'Pending' status.
    raw_title = data.get('title')
    raw_description = data.get('description')

    if not raw_title or not raw_description:
        return jsonify({"message": "Title and description are required"}), 400

    # ── 2. Sanitize inputs ──────────────────────────────────
    title = sanitize_text(str(raw_title))
    description = sanitize_text(str(raw_description))

    if len(title) == 0 or len(description) == 0:
        return jsonify({"message": "Title and description cannot be blank"}), 400
    if len(title) > 200:
        return jsonify({"message": "Title too long (max 200 characters)"}), 400
    if len(description) > 1000:
        return jsonify({"message": "Description too long (max 1000 characters)"}), 400

    # ── 3. Duplicate check ──────────────────────────────────
    # Case-insensitive comparison so "My Issue" and "my issue" are treated as the same
    existing = Complaint.query.filter(
        Complaint.user_id == current_user,
        db.func.lower(Complaint.title) == title.lower(),
        db.func.lower(Complaint.description) == description.lower()
    ).first()

    if existing:
        return jsonify({"message": "You have already submitted this complaint"}), 409

    # ── 4. Persist ──────────────────────────────────────────
    new_complaint = Complaint(title=title, description=description, user_id=current_user)
    db.session.add(new_complaint)
    db.session.commit()

    return jsonify({"message": "Complaint submitted successfully"})


@app.route('/my-complaints', methods=['GET'])
@jwt_required()
def get_my_complaints():
    current_user = get_jwt_identity()
    complaints = Complaint.query.filter_by(user_id=current_user).all()
    complaint_list = [{
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "status": c.status
    } for c in complaints]
    return jsonify(complaint_list)


@app.route('/delete-complaint/<int:complaint_id>', methods=['DELETE'])
@jwt_required()
def delete_complaint(complaint_id):
    current_user = get_jwt_identity()
    complaint = Complaint.query.get(complaint_id)

    if not complaint:
        return jsonify({"message": "Complaint not found"}), 404

    if str(complaint.user_id) != str(current_user):
        return jsonify({"message": "Unauthorized: You can only delete your own complaints"}), 403

    ComplaintLog.query.filter_by(complaint_id=complaint_id).delete()
    db.session.delete(complaint)
    db.session.commit()

    return jsonify({"message": "Complaint deleted successfully"})


# ============================================================
# ADMIN ROUTES
# ============================================================

@app.route('/admin/dashboard', methods=['GET'])
@jwt_required()
def admin_dashboard():
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    if user.role != 'admin':
        return jsonify({"message": "Access denied"}), 403
    return jsonify({"message": "Welcome Admin"})


@app.route('/admin/complaints', methods=['GET'])
@jwt_required()
def view_all_complaints():
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    if user.role != 'admin':
        return jsonify({"message": "Access denied"}), 403

    complaints = Complaint.query.all()
    complaint_list = [{
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "status": c.status,
        "user_id": c.user_id
    } for c in complaints]
    return jsonify(complaint_list)


@app.route('/admin/update-status/<int:complaint_id>', methods=['PUT'])
@jwt_required()
def update_complaint_status(complaint_id):
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    if user.role != 'admin':
        return jsonify({"message": "Access denied"}), 403

    complaint = Complaint.query.get(complaint_id)
    if not complaint:
        return jsonify({"message": "Complaint not found"}), 404

    data = request.get_json()
    old_status = complaint.status
    new_status = data.get('status')
    complaint.status = new_status

    log = ComplaintLog(
        complaint_id=complaint.id,
        admin_id=user.id,
        old_status=old_status,
        new_status=new_status
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Complaint status updated successfully"})


@app.route('/admin/delete-complaint/<int:complaint_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_complaint(complaint_id):
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    if user.role != 'admin':
        return jsonify({"message": "Access denied"}), 403

    complaint = Complaint.query.get(complaint_id)
    if not complaint:
        return jsonify({"message": "Complaint not found"}), 404

    ComplaintLog.query.filter_by(complaint_id=complaint_id).delete()
    db.session.delete(complaint)
    db.session.commit()

    return jsonify({"message": "Complaint deleted successfully"})


@app.route('/admin/users', methods=['GET'])
@jwt_required()
def get_all_users():
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    if user.role != 'admin':
        return jsonify({"message": "Access denied"}), 403

    users = User.query.all()
    user_list = [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "role": u.role
    } for u in users]
    return jsonify(user_list)


@app.route('/admin/update-role/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    current_user = get_jwt_identity()
    admin = User.query.get(current_user)
    if admin.role != 'admin':
        return jsonify({"message": "Access denied"}), 403

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"message": "User not found"}), 404

    if str(target_user.id) == str(current_user):
        return jsonify({"message": "Cannot change your own role"}), 400

    data = request.get_json()
    new_role = data.get('role')
    if new_role not in ['user', 'admin']:
        return jsonify({"message": "Invalid role. Must be 'user' or 'admin'"}), 400

    target_user.role = new_role
    db.session.commit()

    return jsonify({"message": f"User role updated to {new_role}"})


with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)
