import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report

# Load dataset
df = pd.read_csv("../data/NSL_KDD_Train.csv", header=None)

# Split features and label
X = df.iloc[:, :-1]
y = df.iloc[:, -1]

# Convert label to binary
y_binary = y.apply(lambda x: 0 if x == "normal" else 1)

# Encode categorical columns
categorical_cols = [1, 2, 3]
for col in categorical_cols:
    encoder = LabelEncoder()
    X[col] = encoder.fit_transform(X[col])

# Scale
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train Isolation Forest
model = IsolationForest(
    n_estimators=100,
    contamination=0.47,  # roughly attack ratio
    random_state=42
)

model.fit(X_scaled)

# Predict
y_pred = model.predict(X_scaled)

# Convert predictions:
# IsolationForest: -1 = anomaly, 1 = normal
y_pred = [1 if x == -1 else 0 for x in y_pred]

print("Classification Report:\n")
print(classification_report(y_binary, y_pred))

# Save model and scaler
joblib.dump(model, "../models/isolation_forest.pkl")
joblib.dump(scaler, "../models/scaler.pkl")

print("\nModel saved successfully.")