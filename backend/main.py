import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import json
import random
from contextlib import asynccontextmanager
from datetime import datetime
from database import (
    init_db,
    insert_log,
    get_logs,
    get_analytics,
    get_attack_distribution,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(traffic_simulator())
    yield
    task.cancel()
# ---------------- CREATE APP ----------------
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# ---------------- LOAD MODELS ----------------
anomaly_model = joblib.load("../models/isolation_forest.pkl")
anomaly_scaler = joblib.load("../models/scaler.pkl")

classifier_model = joblib.load("../models/attack_classifier.pkl")
classifier_scaler = joblib.load("../models/classifier_scaler.pkl")
label_encoder = joblib.load("../models/label_encoder.pkl")

# ---------------- WEBSOCKET MANAGER ----------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.append(connection)

        # Clean dead connections
        for dc in disconnected:
            self.disconnect(dc)


manager = ConnectionManager()

# ---------------- AUTO TRAFFIC SIMULATOR ----------------
async def traffic_simulator():
    attack_types = label_encoder.classes_

    while True:
        await asyncio.sleep(2)

        anomaly = random.choice([0, 0, 0, 1])
        attack_type = random.choice(attack_types)

        base_risk = random.randint(10, 70)
        if anomaly == 1:
            base_risk += random.randint(20, 40)

        risk_score = min(100, base_risk)

        print("Simulator running...", attack_type, risk_score)

        insert_log(anomaly, attack_type, risk_score)

        log_data = {
            "timestamp": str(datetime.now()),
            "anomaly": anomaly,
            "attack_type": attack_type,
            "risk_score": risk_score,
        }

        await manager.broadcast(log_data)
# ---------------- DATA MODEL ----------------
class TrafficData(BaseModel):
    features: list[float]

# ---------------- HOME ----------------
@app.get("/")
def home():
    return {"message": "AI IDS System Running"}

# ---------------- PREDICT ----------------
@app.post("/predict")
async def predict(data: TrafficData):
    try:
        arr = np.array(data.features).reshape(1, -1)

        # ----- Anomaly Detection -----
        arr_scaled_anomaly = anomaly_scaler.transform(arr)
        anomaly_pred = anomaly_model.predict(arr_scaled_anomaly)
        anomaly = 1 if anomaly_pred[0] == -1 else 0

        # ----- Classification -----
        arr_scaled_classifier = classifier_scaler.transform(arr)
        probabilities = classifier_model.predict_proba(arr_scaled_classifier)
        max_prob = float(np.max(probabilities))

        class_pred = classifier_model.predict(arr_scaled_classifier)
        attack_type = label_encoder.inverse_transform(class_pred)[0]

        # ----- Risk Score (Dynamic Simulation) -----
        risk_score = random.randint(10, 90)

        if anomaly == 1:
            risk_score = min(100, risk_score + random.randint(5, 20))

        # ----- Store in Database -----
        insert_log(anomaly, attack_type, risk_score)

        # ----- Prepare Log Data -----
        log_data = {
            "timestamp": str(datetime.now()),
            "anomaly": anomaly,
            "attack_type": attack_type,
            "risk_score": risk_score,
        }

        # ----- Broadcast to WebSocket Clients -----
        await manager.broadcast(log_data)

        return log_data

    except Exception as e:
        return {"error": str(e)}

# ---------------- LOGS ----------------
@app.get("/logs")
def fetch_logs():
    return get_logs()

# ---------------- ANALYTICS ----------------
@app.get("/analytics")
def analytics():
    return get_analytics()

# ---------------- DISTRIBUTION ----------------
@app.get("/distribution")
def attack_distribution():
    return get_attack_distribution()

# ---------------- WEBSOCKET ----------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        
