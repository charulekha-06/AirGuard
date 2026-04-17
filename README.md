# AirGuard AI 
### Real-Time Leak Detection & Localization for Engine Test Cells

---

## 🧠 Overview

AirGuard AI is a real-time monitoring system designed to detect and localize air and exhaust leaks in engine test cells using existing sensor data.

It combines physics-based feature engineering with machine learning to provide accurate, explainable, and actionable insights—without requiring any additional hardware.

---

## 🎯 Problem Statement

Engine test cells often experience hidden air or exhaust leaks that lead to:

- Increased downtime (1–7 days per incident)
- High operational costs
- Reduced testing efficiency
- Potential hardware damage

Traditional detection methods are manual, slow, and unreliable.

---

## 💡 Solution

AirGuard AI provides:

- Real-time leak detection
- Leak localization (Intake, CAC, Exhaust)
- Confidence-based predictions
- Actionable recommendations

All using existing sensor data and lightweight edge processing.

---

## ⚙️ System Architecture
Sensor Data → Feature Engineering → Anomaly Detection → Leak Classification → Output Decision


### Components:

- **Input Sensors**
  - MAF (Mass Air Flow)
  - MAP (Manifold Pressure)
  - EBP (Exhaust Back Pressure)
  - EGT (Exhaust Temperature)
  - Lambda (Air-Fuel Ratio)

- **Processing**
  - Steady-state filtering
  - Physics-based feature extraction

- **Models**
  - Isolation Forest → Anomaly Detection
  - Random Forest → Leak Localization

- **Output**
  - Leak status
  - Location
  - Confidence
  - Recommended action

---

## 🧪 Dataset

The dataset is **simulation-based** and includes:

- Normal operating conditions
- Intake leaks (small, medium, severe, intermittent)
- CAC leaks (small, medium, severe, unstable)
- Exhaust leaks (small, medium, severe, pulsating)

### Features:
- RPM
- MAF
- MAP
- EBP
- EGT
- Lambda

---

## 🧠 Machine Learning Approach

### 1. Anomaly Detection
- **Model**: Isolation Forest
- Purpose: Detect deviations from normal engine behavior

### 2. Leak Localization
- **Model**: Random Forest Classifier
- Purpose: Identify leak location

### Output Format:
LeakDetected: True
Location: Intake Leak
Confidence: 94.0%
Action: Inspect Intake System


---

## 🖥️ Frontend (Prototype)

A high-fidelity UI dashboard was developed using a red, black, and white industrial theme.

### Features:
- Real-time sensor visualization
- Engine flow diagram
- Leak detection panel
- Alert system for critical conditions

---

## 🚀 Deployment

- Runs on edge devices (e.g., Raspberry Pi)
- No additional hardware required
- Compatible with SCADA systems
- Can be containerized using Docker

---

## 💡 Key Innovations

- Hybrid approach: Physics + Machine Learning
- No additional hardware requirement
- Real-time decision-making
- Robust to noise and varying conditions

---

## ⚠️ Limitations

- Dataset is simulation-based
- Real-world validation required
- Accuracy may vary with sensor quality

---

## 🔮 Future Work

- Integration with real test cell data
- Expansion to finer leak localization (multi-zone detection)
- Adaptive learning with continuous data streams
- Predictive maintenance capabilities

---

## 🏆 Impact

AirGuard AI enables:

- Faster fault detection
- Reduced downtime
- Improved test cell efficiency
- Safer and more reliable operations

---

## 📌 Conclusion

AirGuard AI transforms raw sensor data into actionable insights, enabling faster, smarter, and more reliable leak detection in industrial environments.

---
