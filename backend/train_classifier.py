import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# Load dataset
df = pd.read_csv("../data/NSL_KDD_Train.csv", header=None)

# Split features and label
X = df.iloc[:, :-1]
y = df.iloc[:, -1]

# Encode categorical feature columns (1,2,3)
categorical_cols = [1, 2, 3]
for col in categorical_cols:
    encoder = LabelEncoder()
    X[col] = encoder.fit_transform(X[col])

# Encode attack labels
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train RandomForest classifier
clf = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    n_jobs=-1,
    class_weight="balanced"
)

clf.fit(X_scaled, y_encoded)

# Evaluate
y_pred = clf.predict(X_scaled)

print("Classification Report:\n")
print(classification_report(y_encoded, y_pred))

# Save classifier and encoders
joblib.dump(clf, "../models/attack_classifier.pkl")
joblib.dump(label_encoder, "../models/label_encoder.pkl")
joblib.dump(scaler, "../models/classifier_scaler.pkl")

print("\nClassifier saved successfully.")