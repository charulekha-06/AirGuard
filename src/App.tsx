import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ArrowDownRight, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
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

type LeakEvent = {
  id: number;
  startTime: string;
  endTime?: string;
  type: string;
  location: string;
  confidence: number | string;
  action: string;
};

const LeakDataTable = ({ events }: { events: LeakEvent[] }) => {
  return (
    <div className="leak-table-container">
      <table className="leak-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Time</th>
            <th>Type</th>
            <th>Location</th>
            <th>Confidence</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-state">No leaks detected in the current session</td>
            </tr>
          ) : (
            events.slice().reverse().map((event) => (
              <tr key={event.id} className="leak-row">
                <td>#{event.id}</td>
                <td className="time-cell">{event.startTime}</td>
                <td className="type-cell">{event.type}</td>
                <td className="location-cell">
                  <span className={`location-badge ${event.location.toLowerCase()}`}>
                    {event.location}
                  </span>
                </td>
                <td>{event.confidence}%</td>
                <td className="action-cell">{event.action}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
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

  const [leakEvents, setLeakEvents] = useState<LeakEvent[]>([]);

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

        if (data.prediction.is_leak) {
          setLeakEvents(prev => {
            const lastEvent = prev[prev.length - 1];
            // If it's a new leak occurrence or different from the last active one
            if (!lastEvent || lastEvent.endTime || lastEvent.type !== data.prediction.leak_type_name || lastEvent.location !== data.prediction.location) {
               // If type/location changed but old one was still active, end it
               if (lastEvent && !lastEvent.endTime) {
                 lastEvent.endTime = timeStr;
               }
               return [...prev, {
                 id: prev.length + 1,
                 startTime: timeStr,
                 type: data.prediction.leak_type_name,
                 location: data.prediction.location,
                 confidence: data.prediction.confidence,
                 action: data.prediction.action
               }];
            }
            return prev;
          });
        } else {
          // If leak ended, update the last event's endTime if not already set
          setLeakEvents(prev => {
            if (prev.length > 0) {
              const lastEvent = prev[prev.length - 1];
              if (!lastEvent.endTime) {
                return [...prev.slice(0, -1), { ...lastEvent, endTime: timeStr }];
              }
            }
            return prev;
          });
        }

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
      <div className={`banner-container ${isLeakDetected ? 'active' : ''}`}>
        <div className={`top-banner-alert ${isLeakDetected ? 'alert-text-blink' : ''}`}>
          {isLeakDetected ? (
            <>
              <AlertTriangle style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
              CRITICAL LEAK DETECTED: {prediction.leak_type_name}
            </>
          ) : (
            <>SYSTEM STATUS: ONLINE | AI MONITOR ACTIVE</>
          )}
        </div>
      </div>

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
        <div className="panel-title" style={{borderBottom: 'none'}}>Sensor Trends (MAP, MAF & EBP)</div>
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
              <Legend verticalAlign="top" height={36}/>
              
              {/* Leak Event Visual Annotations */}
              {leakEvents.map(event => {
                // Determine visibility in current historical window
                const firstTime = historicalData.length > 0 ? historicalData[0].time : null;
                const lastTime = historicalData.length > 0 ? historicalData[historicalData.length - 1].time : null;
                const inWindow = (time: string) => historicalData.some(d => d.time === time);
                
                const showLine = inWindow(event.startTime);
                
                // For area, we show it if the leak interval overlaps with the historical window
                // Interval is [startTime, endTime || lastTime]
                // Simplest way: if startTime is in window OR endTime is in window OR (startTime before window AND (no endTime OR endTime after window))
                const startIdx = historicalData.findIndex(d => d.time === event.startTime);
                const endIdx = event.endTime ? historicalData.findIndex(d => d.time === event.endTime) : historicalData.length - 1;

                // If neither in window, and leak didn't span across the window, don't show area
                const showArea = startIdx !== -1 || endIdx !== -1 || (event.startTime < (firstTime || '') && (!event.endTime || event.endTime > (lastTime || '')));

                return (
                  <g key={`leak-viz-${event.id}`}>
                    {showLine && (
                      <ReferenceLine 
                        x={event.startTime} 
                        stroke="var(--accent-red)" 
                        strokeDasharray="5 5"
                        label={{ value: 'Leak Detected', position: 'top', fill: 'var(--accent-red)', fontSize: 10, fontWeight: 'bold' }}
                        isFront={false}
                      />
                    )}
                    {showArea && (
                      <ReferenceArea 
                        x1={startIdx !== -1 ? event.startTime : firstTime} 
                        x2={endIdx !== -1 ? (event.endTime || lastTime) : lastTime} 
                        fill="var(--accent-red)" 
                        fillOpacity={0.15} 
                        stroke="none"
                        isFront={false}
                      />
                    )}
                  </g>
                );
              })}

              <Line yAxisId="left" type="monotone" dataKey="MAP" stroke="var(--accent-red)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="left" type="monotone" dataKey="EBP" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
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

          <div className="panel-title" style={{marginTop: '1.5rem'}}>Leak Event History</div>
          <LeakDataTable events={leakEvents} />
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
