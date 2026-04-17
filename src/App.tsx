import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ArrowDownRight, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

// Type definitions
type SensorDataPoint = {
  time: string;
  MAF: number;
  MAP: number;
  EBP: number;
  EGT: number;
  Lambda: number;
  RPM?: number; // Python model returns RPM
};

type PredictionResult = {
  leak_type_name: string;
  location: string;
  action: string;
  confidence: number | string;
  is_leak: boolean;
};

const SensorCard = ({ name, value, unit, isAlert, prevValue }: { name: string, value: number, unit: string, isAlert: boolean, prevValue: number }) => {
  const trendUp = value > prevValue;
  const showAlert = isAlert;

  return (
    <div className={`panel-card ${showAlert ? 'alert alert-pulse alert-shake' : ''}`}>
      <div className="sensor-row-header">
        <span className="sensor-name">{name}</span>
        <span className={`sensor-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
          {trendUp ? <ArrowUpRight /> : <ArrowDownRight />}
        </span>
      </div>
      <div className="sensor-value-container">
        <span className={`sensor-value ${showAlert ? 'alert-text-blink' : ''}`}>
          {value.toFixed(2)}
        </span>
        <span className="sensor-unit">{unit}</span>
      </div>
    </div>
  );
};

export default function App() {
  const [isLeakForced, setIsLeakForced] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [historicalData, setHistoricalData] = useState<SensorDataPoint[]>([]);
  const [currentSensors, setCurrentSensors] = useState<SensorDataPoint | null>(null);
  const [prevSensors, setPrevSensors] = useState<SensorDataPoint | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);
  
  const [prediction, setPrediction] = useState<PredictionResult>({
    leak_type_name: 'NO LEAK', location: 'N/A', action: 'None Required', confidence: '--', is_leak: false
  });

  // Interval for data update
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/sensor?force_leak=${isLeakForced}`);
        const data = await response.json();
        
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        
        const newVals = { time: timeStr, ...data.sensors };
        
        setCurrentSensors(prev => {
           if (prev) setPrevSensors(prev);
           return newVals;
        });
        
        setHistoricalData(prev => {
          const newData = [...prev, newVals];
          if (newData.length > 30) newData.shift();
          return newData;
        });

        setPrediction(data.prediction);
        setLastUpdated(0);
        
      } catch (e) {
        console.error("Failed to fetch from API", e);
      }
    };

    const interval = setInterval(fetchSensorData, 1000);
    return () => clearInterval(interval);
  }, [isLeakForced]);

  // Secondary interval just for "last updated" counter
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRunDetection = () => {
    if (isLeakForced) {
      setIsLeakForced(false);
      setPrediction(prev => ({...prev, is_leak: false})); // optimistic ui
    } else {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        setIsLeakForced(true);
      }, 1500);
    }
  };

  const isLeakDetected = prediction.is_leak;
  const isIntakeLeak = prediction.location === 'Intake';
  const isCACLeak = prediction.location === 'CAC';
  const isExhaustLeak = prediction.location === 'Exhaust';

  return (
    <div className={`app-container ${isLeakDetected ? 'alert-mode' : ''}`}>
      {isLeakDetected && (
        <div className="top-banner-alert alert-text-blink">
          <AlertTriangle style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
          CRITICAL LEAK DETECTED: {prediction.leak_type_name}
        </div>
      )}

      <nav className="navbar">
        <div className={`brand ${isLeakDetected ? 'alert' : ''}`}>
          AirGuard AI
        </div>
        <div className="sys-status-wrapper">
          <div className="status-indicator">
            <div className={`status-dot ${isLeakDetected ? 'alert alert-text-blink' : 'normal'}`}></div>
            {isLeakDetected ? 'AI ALERT ACTIVE' : 'SYSTEM NORMAL'}
          </div>
          <div className="timestamp">
            Last Updated: {lastUpdated} sec ago
          </div>
        </div>
      </nav>

      <section className="chart-section">
        <div className="panel-title" style={{borderBottom: 'none'}}>Sensor Trends (MAP & MAF)</div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" stroke="#888" fontSize={12} tickMargin={10} />
              <YAxis yAxisId="left" stroke="var(--text-main)" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line yAxisId="left" type="monotone" dataKey="MAP" stroke="var(--accent-red)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="MAF" stroke="var(--success-green)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <main className="main-dashboard">
        {/* Left Panel */}
        <div className="panel">
          <div className="panel-title">Live Sensor Data</div>
          <div className="sensor-cards">
            {currentSensors && (
              <>
                <SensorCard name="MAF" value={currentSensors.MAF} unit="g/s" isAlert={isLeakDetected} prevValue={prevSensors?.MAF || 0} />
                <SensorCard name="MAP" value={currentSensors.MAP} unit="kPa" isAlert={isLeakDetected && (isIntakeLeak || isCACLeak)} prevValue={prevSensors?.MAP || 0} />
                <SensorCard name="EBP" value={currentSensors.EBP} unit="kPa" isAlert={isLeakDetected && isExhaustLeak} prevValue={prevSensors?.EBP || 0} />
                <SensorCard name="EGT" value={currentSensors.EGT} unit="°C" isAlert={isLeakDetected && (isExhaustLeak || isCACLeak || isIntakeLeak)} prevValue={prevSensors?.EGT || 0} />
                <SensorCard name="Lambda" value={currentSensors.Lambda} unit="λ" isAlert={isLeakDetected} prevValue={prevSensors?.Lambda || 0} />
              </>
            )}
          </div>
        </div>

        {/* Center Panel */}
        <div className="panel">
          <div className="panel-title">Engine Flow Visualization</div>
          <div className={`flow-diagram-container panel-card ${isLeakDetected ? 'alert' : ''}`}>
            
            <div className="flow-diagram">
              <div className={`flow-node ${isIntakeLeak ? 'alert alert-pulse' : ''}`}>
                {isIntakeLeak && <div className="leak-label alert-shake">Leak Detected Here</div>}
                Intake
              </div>
              <div className={`flow-line ${isLeakDetected ? 'alert' : ''}`}></div>
              
              <div className={`flow-node ${isCACLeak ? 'alert alert-pulse' : ''}`}>
                {isCACLeak && <div className="leak-label alert-shake">Leak Detected Here</div>}
                Turbo / CAC
              </div>
              
              <div className={`flow-line ${isLeakDetected ? 'alert' : ''}`}></div>
              
              <div className="flow-node">
                Engine
              </div>
              
              <div className={`flow-line ${isLeakDetected ? 'alert' : ''}`}></div>
              
              <div className={`flow-node ${isExhaustLeak ? 'alert alert-pulse' : ''}`}>
                {isExhaustLeak && <div className="leak-label alert-shake">Leak Detected Here</div>}
                Exhaust
              </div>
            </div>

            <div style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 'auto'}}>
              Real-time fluid dynamic pathway simulation
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="panel">
          <div className="panel-title">AI Decision Output</div>
          <div className={`decision-panel ${isLeakDetected ? 'alert alert-pulse' : ''}`}>
            
            <div className="status-display">
              {isLeakDetected ? (
                <ShieldAlert size={64} className="alert-text-blink" color="var(--accent-red)" />
              ) : (
                <CheckCircle size={64} color="var(--success-green)" />
              )}
              
              <div className={`status-value ${isLeakDetected ? 'alert' : 'normal'}`}>
                {isLeakDetected ? 'LEAK DETECTED' : 'NO LEAK'}
              </div>
            </div>

            <div className="decision-details">
              <div className="detail-row">
                <span className="detail-label">Model Predicts:</span>
                <span className="detail-value" style={{color: isLeakDetected ? 'var(--accent-red)' : ''}}>
                  {prediction.leak_type_name}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Confidence:</span>
                <span className="detail-value">{prediction.confidence}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Recommended Action:</span>
                <span className="detail-value">{prediction.action}</span>
              </div>
            </div>

            <button 
              className={`cta-button ${isLeakForced ? 'reset' : ''}`}
              onClick={handleRunDetection}
              disabled={isScanning}
            >
              {isScanning ? 'Testing Scenario...' : isLeakForced ? 'RESET SYSTEM' : 'TRIGGER RANDOM LEAK'}
            </button>
            
          </div>
        </div>
      </main>
    </div>
  );
}
