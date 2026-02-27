import sqlite3

DB_NAME = "../ids_logs.db"

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


def insert_log(anomaly, attack_type, risk_score):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO attack_logs (anomaly, attack_type, risk_score)
        VALUES (?, ?, ?)
    """, (anomaly, attack_type, risk_score))

    conn.commit()
    conn.close()
def get_logs():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM attack_logs ORDER BY id DESC")
    rows = cursor.fetchall()

    conn.close()

    logs = []
    for row in rows:
        logs.append({
            "id": row[0],
            "timestamp": row[1],
            "anomaly": row[2],
            "attack_type": row[3],
            "risk_score": row[4]
        })

    return logs
def get_analytics():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Total logs
    cursor.execute("SELECT COUNT(*) FROM attack_logs")
    total_logs = cursor.fetchone()[0]

    # Total anomalies
    cursor.execute("SELECT COUNT(*) FROM attack_logs WHERE anomaly = 1")
    total_anomalies = cursor.fetchone()[0]

    # Average risk score
    cursor.execute("SELECT AVG(risk_score) FROM attack_logs")
    avg_risk = cursor.fetchone()[0]
    avg_risk = round(avg_risk, 2) if avg_risk else 0

    # Most frequent attack type
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

    distribution = {}
    for row in rows:
        distribution[row[0]] = row[1]

    return distribution