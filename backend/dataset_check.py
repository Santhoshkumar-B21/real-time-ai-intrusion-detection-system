import pandas as pd
from sklearn.preprocessing import LabelEncoder

df = pd.read_csv("../data/NSL_KDD_Train.csv", header=None)

# Separate features and label
X = df.iloc[:, :-1]
y = df.iloc[:, -1]

# Encode categorical columns
categorical_cols = [1, 2, 3]
for col in categorical_cols:
    encoder = LabelEncoder()
    X[col] = encoder.fit_transform(X[col])

# Find first attack row
attack_index = y[y != "normal"].index[0]

print("Attack label:", y[attack_index])
print("Feature values:")
print(X.iloc[attack_index].tolist())