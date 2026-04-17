import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sklearn.ensemble import RandomForestClassifier
import uvicorn
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# DATA GENERATION UTILS (from user)
# -----------------------------
def generate_base(n):
    return pd.DataFrame({
        "RPM": 1500 + np.random.normal(0, 5, n),
        "MAF": 20 + np.random.normal(0, 0.3, n),
        "MAP": 1.2 + np.random.normal(0, 0.02, n),
        "EBP": 1.1 + np.random.normal(0, 0.02, n),
        "EGT": 450 + np.random.normal(0, 5, n),
        "Lambda": 1.0 + np.random.normal(0, 0.02, n),
    })

def intake_leak(df, severity="medium"):
    df = df.copy()
    if severity == "small":
        df["MAF"] -= np.random.uniform(0.5, 1.0, len(df))
        df["MAP"] -= np.random.uniform(0.02, 0.05, len(df))
    elif severity == "medium":
        df["MAF"] -= np.random.uniform(1.5, 2.5, len(df))
        df["MAP"] -= np.random.uniform(0.05, 0.1, len(df))
    elif severity == "severe":
        df["MAF"] -= np.random.uniform(3, 5, len(df))
        df["MAP"] -= np.random.uniform(0.1, 0.2, len(df))
        df["EGT"] += np.random.uniform(10, 20, len(df))
    elif severity == "intermittent":
        mask = np.random.choice([0, 1], size=len(df))
        df["MAF"] -= mask * np.random.uniform(1.5, 3, len(df))
        df["MAP"] -= mask * np.random.uniform(0.05, 0.1, len(df))
    df["Lambda"] += np.random.uniform(0.05, 0.1, len(df))
    return df

def cac_leak(df, severity="medium"):
    df = df.copy()
    if severity == "small":
        df["MAP"] -= np.random.uniform(0.02, 0.05, len(df))
    elif severity == "medium":
        df["MAP"] -= np.random.uniform(0.05, 0.1, len(df))
    elif severity == "severe":
        df["MAP"] -= np.random.uniform(0.1, 0.2, len(df))
        df["EGT"] += np.random.uniform(10, 20, len(df))
    elif severity == "unstable":
        df["MAP"] += np.random.normal(0, 0.1, len(df))
    df["MAF"] -= np.random.uniform(1.0, 2.0, len(df))
    df["Lambda"] += np.random.uniform(0.05, 0.1, len(df))
    return df

def exhaust_leak(df, severity="medium"):
    df = df.copy()
    if severity == "small":
        df["EBP"] += np.random.uniform(0.05, 0.1, len(df))
    elif severity == "medium":
        df["EBP"] += np.random.uniform(0.1, 0.2, len(df))
    elif severity == "severe":
        df["EBP"] += np.random.uniform(0.2, 0.4, len(df))
        df["EGT"] += np.random.uniform(15, 30, len(df))
    elif severity == "pulsating":
        df["EBP"] += np.random.normal(0, 0.1, len(df))
    df["EGT"] += np.random.uniform(5, 15, len(df))
    return df

# -----------------------------
# BUILD MODEL ON STARTUP
# -----------------------------
print("Loading exact training dataset and training model...")

df = pd.read_excel("advanced training dataset.xlsx")
X = df.drop(columns=["LeakType"])
y = df["LeakType"]

model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X, y)
print("Model trained successfully via scikit-learn!")

LEAK_MAP = {
    0: {"name": "NO LEAK", "action": "None Required", "location": "N/A"},
    1: {"name": "INTAKE LEAK", "action": "Inspect Intake System", "location": "Intake"},
    2: {"name": "CAC LEAK", "action": "Inspect Charge Air Cooler", "location": "CAC"},
    3: {"name": "EXHAUST LEAK", "action": "Inspect Exhaust System", "location": "Exhaust"},
}

@app.get("/sensor")
def get_sensor_data(force_leak: bool = False):
    # Generate 1 sample of sensor data
    base = generate_base(1)
    
    if force_leak:
        # Pick a random leak type and severity for demonstration
        leak_func = random.choice([intake_leak, cac_leak, exhaust_leak])
        severity = random.choice(["small", "medium", "severe"])
        df_sample = leak_func(base, severity)
    else:
        df_sample = base

    # Predict using the trained model
    proba = model.predict_proba(df_sample)[0]
    prediction = int(np.argmax(proba))
    confidence = float(np.max(proba)) * 100

    # Format response
    data = df_sample.iloc[0].to_dict()
    result = LEAK_MAP[prediction]
    
    return {
        "sensors": data,
        "prediction": {
            "leak_type_code": prediction,
            "leak_type_name": result["name"],
            "location": result["location"],
            "action": result["action"],
            "confidence": round(confidence, 1),
            "is_leak": prediction != 0
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
