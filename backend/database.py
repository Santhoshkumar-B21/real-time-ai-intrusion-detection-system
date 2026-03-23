import sqlite3
import os

# Absolute path (production-safe)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "../ids_logs.db")


# ---------------- INITIALIZE DATABASE ----------------
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attack_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            anomaly INTEGER,
            attack_type TEXT,
            risk_score INTEGER
        )
    """)

    conn.commit()
    conn.close()


# ---------------- INSERT LOG ----------------
def insert_log(anomaly, attack_type, risk_score):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO attack_logs (anomaly, attack_type, risk_score)
        VALUES (?, ?, ?)
    """, (anomaly, attack_type, risk_score))

    conn.commit()
    conn.close()


# ---------------- FETCH LOGS (WITH FILTERS) ----------------
def get_logs(anomaly=None, min_risk=None, attack_type=None):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    query = """
        SELECT id, timestamp, anomaly, attack_type, risk_score
        FROM attack_logs
        WHERE 1=1
    """
    params = []

    if anomaly is not None:
        query += " AND anomaly = ?"
        params.append(anomaly)

    if min_risk is not None:
        query += " AND risk_score >= ?"
        params.append(min_risk)

    if attack_type is not None:
        query += " AND attack_type = ?"
        params.append(attack_type)

    query += " ORDER BY id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "timestamp": row[1],
            "anomaly": row[2],
            "attack_type": row[3],
            "risk_score": row[4],
        }
        for row in rows
    ]


# ---------------- ANALYTICS ----------------
def get_analytics():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM attack_logs")
    total_logs = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM attack_logs WHERE anomaly = 1")
    total_anomalies = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(risk_score) FROM attack_logs")
    avg_risk = cursor.fetchone()[0]
    avg_risk = round(avg_risk, 2) if avg_risk else 0

    cursor.execute("""
        SELECT attack_type, COUNT(*) as count
        FROM attack_logs
        GROUP BY attack_type
        ORDER BY count DESC
        LIMIT 1
    """)
    result = cursor.fetchone()
    most_frequent_attack = result[0] if result else None

    conn.close()

    return {
        "total_logs": total_logs,
        "total_anomalies": total_anomalies,
        "average_risk_score": avg_risk,
        "most_frequent_attack": most_frequent_attack
    }


# ---------------- DISTRIBUTION ----------------
def get_attack_distribution():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT attack_type, COUNT(*) as count
        FROM attack_logs
        GROUP BY attack_type
    """)

    rows = cursor.fetchall()
    conn.close()

    return {row[0]: row[1] for row in rows}