# AirGuard

AirGuard is a comprehensive system designed to monitor engine sensor data and predict potential leaks in real-time. It consists of a React-based frontend dashboard for visualization and a Python/FastAPI backend powered by a machine learning model to classify leak types.

## Features

- **Real-Time Sensor Simulation:** Generates simulated engine sensor data, including RPM, Mass Air Flow (MAF), Manifold Absolute Pressure (MAP), Exhaust Back Pressure (EBP), Exhaust Gas Temperature (EGT), and Lambda.
- **Machine Learning Leak Detection:** Utilizes a Random Forest Classifier trained on engine data to detect and classify anomalies such as Intake Leaks, Charge Air Cooler (CAC) Leaks, and Exhaust Leaks.
- **Interactive Dashboard:** Visualizes the sensor data and prediction results, displaying leak severity, location, and recommended actions using intuitive charts and UI components.

## Tech Stack

### Frontend
- **Framework:** React 19 with Vite
- **Language:** TypeScript
- **Styling:** CSS / Tailwind Utilities (`clsx`, `tailwind-merge`)
- **Icons:** Lucide React
- **Charts:** Recharts

### Backend
- **Framework:** FastAPI
- **Language:** Python 3
- **Machine Learning:** Scikit-Learn (Random Forest)
- **Data Processing:** Pandas, NumPy
- **Server:** Uvicorn

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (for the frontend)
- [Python 3.8+](https://www.python.org/) (for the backend)

### Backend Setup

1. Open a terminal and navigate to the project directory.
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI backend server:
   ```bash
   python api.py
   ```
   *The server will start on `http://localhost:8000`. The machine learning model will be trained automatically on startup using the `advanced training dataset.xlsx` file.*

### Frontend Setup

1. Open a new terminal and navigate to the project directory.
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend application will be available at `http://localhost:5173` (or the port specified by Vite).*

## Project Structure

- `api.py`: The FastAPI application and machine learning model implementation.
- `requirements.txt`: Python dependencies for the backend.
- `advanced training dataset.xlsx`: The dataset used to train the Random Forest model on startup.
- `src/`: Contains the React frontend source code, including components, styles, and the main application logic (`App.tsx`).
- `package.json`: Node.js dependencies and scripts for the frontend.
