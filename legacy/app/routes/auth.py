"""
=============================================================================
SmartEV Vision — Authentication / User Management Routes
=============================================================================
Handles user registration and lookup.  Passwords are *not* required in
this system — participants are registered by lab staff before the VR
session begins.

Endpoints
---------
POST  /api/user/register   — Register a new user
GET   /api/user/<id>        — Look up a user by ID
=============================================================================
"""

from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import User

# ---------------------------------------------------------------------------
# Blueprint definition
# ---------------------------------------------------------------------------
auth_bp = Blueprint("auth", __name__)


# ========================== REGISTER ====================================== #


@auth_bp.route("/register", methods=["POST"])
def register_user():
    """
    Register a new participant.

    Request JSON
    -------------
    {
        "name":   str,     — full name (required)
        "email":  str,     — email address, must be unique (required)
        "age":    int,     — participant age (optional)
        "gender": str      — self-reported gender (optional)
    }

    Returns
    -------
    201  — user created
    400  — missing required fields
    409  — email already registered
    500  — unexpected error
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        age = data.get("age")
        gender = data.get("gender", "").strip() if data.get("gender") else None

        # --- Validate required fields ------------------------------------ #
        if not name or not email:
            return jsonify({"error": "name and email are required"}), 400

        # --- Check for duplicate email ----------------------------------- #
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({
                "error": "A user with this email already exists",
                "user_id": existing.id,
            }), 409

        # --- Create the user --------------------------------------------- #
        new_user = User(
            name=name,
            email=email,
            age=int(age) if age is not None else None,
            gender=gender,
        )
        db.session.add(new_user)
        db.session.commit()

        current_app.logger.info("User registered: %s <%s> (id=%d)", name, email, new_user.id)

        return jsonify({
            "message": "User registered successfully",
            "user": new_user.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Error registering user: %s", str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


# ========================== LOOKUP ======================================== #


@auth_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id: int):
    """
    Retrieve a user by their ID.

    Path parameters
    ----------------
    user_id : int   — primary-key user ID

    Returns
    -------
    200  — user JSON
    404  — user not found
    500  — unexpected error
    """
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": f"User {user_id} not found"}), 404

        return jsonify({"user": user.to_dict()}), 200

    except Exception as e:
        current_app.logger.error("Error fetching user %d: %s", user_id, str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
