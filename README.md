# 🛡️ AirGuard AI
**High-Fidelity Industrial AI Sensor Dashboard**

AirGuard AI is a production-grade prototype application designed to monitor engine test-cell environments in real-time. It leverages a Python-based intelligence backend (Machine Learning) connected via API to a high-contrast, industrial React frontend.

The application detects, localizes, and classifies mechanical system leaks based on live sensor telemetry using a trained Random Forest model.

## 🚀 Key Features

* **Real-time Telemetry Processing**: Polls the backend every second to ingest high-frequency data for `MAF` (Airflow), `MAP` (Pressure), `EBP` (Exhaust), `EGT` (Temperature), and `Lambda`.
* **Flow Diagnostics Sandbox**: A fully animated `Intake → CAC → Engine → Exhaust` fluid pipeline that visually pulses isolated fault zones.
* **Auto Model-Training**: The FastAPI backend inherently fetches `advanced training dataset.xlsx` using pandas to construct and train a `scikit-learn` classification model upon instantiation.
* **Alert Sequence Protocol**: An integrated CSS alarm suite triggers immediate aesthetic changes (Red glows, pulsating borders, status banners) when anomalies are classified.
* **Intelligent Intervention**: Produces statistical confidence matrices (%) and recommended engineer actions.

## 💻 Tech Stack
**Frontend Intelligence**
* Framework: `React 18` + `Vite` + `TypeScript`
* UI Charting: `Recharts`
* Typography: `Space Grotesk` & `Orbitron` Google Fonts
* Icons: `lucide-react`

**Backend Intelligence**
* Environment: `Python 3`
* Server: `FastAPI` + `uvicorn`
* Classification Intelligence: `scikit-learn` (RandomForestClassifier)
* Data Formatting: `pandas`, `numpy`, `openpyxl`

## 🛠️ How to Run Locally

Because AirGuard relies on an ML model pipeline, ensure both the backend and frontend are running simultaneously.

### 1. Start the Machine Learning Backend

Open a terminal and navigate to the project root:

```bash
# 1. Create a virtual environment
python3 -m venv venv

# 2. Activate the virtual environment
source venv/bin/activate

# 3. Install requirements
pip install -r requirements.txt

# 4. Boot the FastAPI Server
python api.py
```
*The API will train the model instantly and launch on `http://localhost:8000`.*

### 2. Start the Frontend Dashboard

Open a **new** terminal window and navigate to the project root:

```bash
# 1. Install Node dependencies
npm install

# 2. Launch the Vite Development Server
npm run dev
```

*The frontend UI will initialize, usually binding to `http://localhost:5173`.*

---
*Created for industrial telemetry & leak identification scoping.*
