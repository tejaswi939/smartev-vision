"""
SmartEV Vision - Database Initialization Script
Creates SQLite database with all required tables and indexes.
"""

import sqlite3
import os


def setup_database(db_path='data/smartev.db'):
    """Create SQLite database with all tables and indexes."""
    # Ensure data directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            age INTEGER,
            gender TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            ev_model TEXT NOT NULL,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            duration REAL,
            engagement_score REAL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Create gaze_data table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gaze_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            timestamp REAL NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            area_label TEXT,
            fixation_duration REAL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    ''')

    # Create vehicle_views table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicle_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            component TEXT NOT NULL,
            view_count INTEGER DEFAULT 0,
            total_duration REAL DEFAULT 0.0,
            revisits INTEGER DEFAULT 0,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    ''')

    # Create predictions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            preferred_model TEXT,
            preference_category TEXT,
            confidence REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    ''')

    # Add indexes on foreign keys for performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_gaze_data_session_id ON gaze_data(session_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vehicle_views_session_id ON vehicle_views(session_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_predictions_session_id ON predictions(session_id)')

    conn.commit()
    conn.close()

    print(f"Database created successfully at: {db_path}")
    print("Tables created: users, sessions, gaze_data, vehicle_views, predictions")
    print("Indexes created on all foreign keys")


if __name__ == '__main__':
    setup_database()
