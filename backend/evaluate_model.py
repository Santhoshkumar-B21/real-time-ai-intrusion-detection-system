import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
import numpy as np

# Load test dataset
df_test = pd.read_csv("../data/NSL_KDD_Test.csv", header=None)

X_test = df_test.iloc[:, :-1]
y_test = df_test.iloc[:, -1]

# Encode categorical columns
categorical_cols = [1, 2, 3]
for col in categorical_cols:
    encoder = LabelEncoder()
    X_test[col] = encoder.fit_transform(X_test[col])

# Load trained classifier and scaler
classifier = joblib.load("../models/attack_classifier.pkl")
scaler = joblib.load("../models/classifier_scaler.pkl")
label_encoder = joblib.load("../models/label_encoder.pkl")

# Filter only known labels
known_classes = set(label_encoder.classes_)
mask = y_test.isin(known_classes)

X_test_filtered = X_test[mask]
y_test_filtered = y_test[mask]

print("Total test samples:", len(y_test))
print("Known label samples:", len(y_test_filtered))
print("Unknown label samples:", len(y_test) - len(y_test_filtered))

# Encode labels
y_test_encoded = label_encoder.transform(y_test_filtered)

# Scale
X_test_scaled = scaler.transform(X_test_filtered)

# Predict
y_pred = classifier.predict(X_test_scaled)

print("\nTest Dataset Classification Report (Known Classes Only):\n")
print(classification_report(y_test_encoded, y_pred))