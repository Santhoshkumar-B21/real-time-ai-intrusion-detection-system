import asyncio
import json
import random
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

import joblib
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import (
    init_db,
    insert_log,
    get_logs,
    get_analytics,
    get_attack_distribution,
)

# ================= DATABASE INIT =================
init_db()

# ================= LOAD MODELS =================
anomaly_model = joblib.load("../models/isolation_forest.pkl")
anomaly_scaler = joblib.load("../models/scaler.pkl")

classifier_model = joblib.load("../models/attack_classifier.pkl")
classifier_scaler = joblib.load("../models/classifier_scaler.pkl")
label_encoder = joblib.load("../models/label_encoder.pkl")


# ================= WEBSOCKET MANAGER =================
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print("WebSocket connected. Total:", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print("WebSocket disconnected. Total:", len(self.active_connections))

    async def broadcast(self, message: dict):
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.append(connection)

        for dc in disconnected:
            self.disconnect(dc)


manager = ConnectionManager()


# ================= TRAFFIC SIMULATOR =================
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

        insert_log(anomaly, attack_type, risk_score)

        log_data = {
            "timestamp": str(datetime.now()),
            "anomaly": anomaly,
            "attack_type": attack_type,
            "risk_score": risk_score,
        }

        print("Simulated:", log_data)

        await manager.broadcast(log_data)


# ================= LIFESPAN =================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting Traffic Simulator...")
    task = asyncio.create_task(traffic_simulator())
    yield
    print("Stopping Traffic Simulator...")
    task.cancel()


# ================= CREATE APP =================
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================= DATA MODEL =================
class TrafficData(BaseModel):
    features: list[float]


# ================= HOME =================
@app.get("/")
def home():
    return {"message": "AI IDS System Running"}


# ================= PREDICT =================
@app.post("/predict")
async def predict(data: TrafficData):
    try:
        arr = np.array(data.features).reshape(1, -1)

        # Anomaly Detection
        arr_scaled_anomaly = anomaly_scaler.transform(arr)
        anomaly_pred = anomaly_model.predict(arr_scaled_anomaly)
        anomaly = 1 if anomaly_pred[0] == -1 else 0

        # Classification
        arr_scaled_classifier = classifier_scaler.transform(arr)
        class_pred = classifier_model.predict(arr_scaled_classifier)
        attack_type = label_encoder.inverse_transform(class_pred)[0]

        # Risk Simulation
        risk_score = random.randint(10, 90)
        if anomaly == 1:
            risk_score = min(100, risk_score + random.randint(5, 20))

        insert_log(anomaly, attack_type, risk_score)

        log_data = {
            "timestamp": str(datetime.now()),
            "anomaly": anomaly,
            "attack_type": attack_type,
            "risk_score": risk_score,
        }

        await manager.broadcast(log_data)

        return log_data

    except Exception as e:
        return {"error": str(e)}


# ================= LOGS WITH FILTERING =================
@app.get("/logs")
def fetch_logs(
    anomaly: Optional[int] = Query(None),
    min_risk: Optional[int] = Query(None),
    attack_type: Optional[str] = Query(None),
):
    return get_logs(anomaly, min_risk, attack_type)


# ================= ANALYTICS =================
@app.get("/analytics")
def analytics():
    return get_analytics()


# ================= DISTRIBUTION =================
@app.get("/distribution")
def attack_distribution():
    return get_attack_distribution()


# ================= WEBSOCKET =================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = {
            "risk": 42,
            "attack": "neptune"
        }
        await websocket.send_json(data)
        await asyncio.sleep(1)