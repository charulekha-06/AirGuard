import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ArrowDownRight, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import './App.css';

type SensorDataPoint = {
  time: string;
  MAF: number;
  MAP: number;
  EBP: number;
  EGT: number;
  Lambda: number;
  RPM?: number;
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
  const calculateDuration = (startTime: string, endTime?: string) => {
    const parseTime = (timeStr: string) => {
      const [h, m, s] = timeStr.split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };
    const start = parseTime(startTime);
    const end = endTime ? parseTime(endTime) : parseTime(`${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`);
    const diff = end - start;
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="leak-table-container">
      <table className="leak-table">
        <thead>
          <tr>
            <th>ID</th><th>Leak Event</th><th>Duration</th><th>Type</th><th>Confidence</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr><td colSpan={6} className="empty-state">No leaks detected in the current session</td></tr>
          ) : (
            events.slice().reverse().map((event) => (
              <tr key={event.id} className="leak-row">
                <td>#{event.id}</td>
                <td className="event-cell">{event.startTime} at <span className={`location-badge ${event.location.toLowerCase()}`}>{event.location}</span></td>
                <td className="duration-cell">{calculateDuration(event.startTime, event.endTime)}</td>
                <td className="type-cell">{event.type}</td>
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

const SensorCard = ({ name, value, unit, isAlert, prevValue }: {
  name: string; value: number; unit: string; isAlert: boolean; prevValue: number;
}) => {
  const trendUp = value > prevValue;
  return (
    <div className={`panel-card ${isAlert ? 'alert alert-pulse alert-shake' : ''}`}>
      <div className="sensor-row-header">
        <span className="sensor-name">{name}</span>
        <span className={`sensor-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
          {trendUp ? <ArrowUpRight /> : <ArrowDownRight />}
        </span>
      </div>
      <div className="sensor-value-container">
        <span className={`sensor-value ${isAlert ? 'alert-text-blink' : ''}`}>{value.toFixed(2)}</span>
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
  const [sensorError, setSensorError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/sensor?force_leak=${isLeakForced}`);
        const data = await response.json();
        setSensorError(null);
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        const newVals = { time: timeStr, ...data.sensors };

        setCurrentSensors(prev => { if (prev) setPrevSensors(prev); return newVals; });
        setHistoricalData(prev => { const n = [...prev, newVals]; if (n.length > 30) n.shift(); return n; });
        setLeakEvents(prev => {
          const last = prev[prev.length - 1];
          if (data.prediction.is_leak) {
            if (!last || last.endTime || last.type !== data.prediction.leak_type_name || last.location !== data.prediction.location) {
              const nextEvents = [...prev, {
                id: prev.length + 1,
                startTime: timeStr,
                type: data.prediction.leak_type_name,
                location: data.prediction.location,
                confidence: data.prediction.confidence,
                action: data.prediction.action,
              }];
              return nextEvents.length > 100 ? nextEvents.slice(nextEvents.length - 100) : nextEvents;
            }
            return prev;
          }
          if (last && !last.endTime) {
            return [...prev.slice(0, -1), { ...last, endTime: timeStr }];
          }
          return prev;
        });
        setPrediction(data.prediction);
        setLastUpdated(0);
      } catch (e) {
        console.error("Failed to fetch from API", e);
        setSensorError('Unable to fetch live sensor data. Start the backend on http://localhost:8000 or check your API server.');
      }
    };
    const interval = setInterval(fetchSensorData, 1000);
    return () => clearInterval(interval);
  }, [isLeakForced]);

  useEffect(() => {
    const timer = setInterval(() => setLastUpdated(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRunDetection = () => {
    if (isLeakForced) {
      setIsLeakForced(false);
      setPrediction(p => ({ ...p, is_leak: false }));
    } else {
      setIsScanning(true);
      setTimeout(() => { setIsScanning(false); setIsLeakForced(true); }, 1500);
    }
  };

  const isLeakDetected = prediction.is_leak;
  const isIntakeLeak = prediction.location === 'Intake';
  const isCACLeak = prediction.location === 'CAC';
  const isExhaustLeak = prediction.location === 'Exhaust';

  return (
    <div className={`app-container ${isLeakDetected ? 'alert-mode' : ''}`}>

      {/* Banner */}
      <div className={`banner-container ${isLeakDetected ? 'active' : ''}`}>
        <div className={`top-banner-alert ${isLeakDetected ? 'alert-text-blink' : ''}`}>
          {isLeakDetected ? (
            <><AlertTriangle style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />CRITICAL LEAK DETECTED: {prediction.leak_type_name}</>
          ) : <>SYSTEM STATUS: ONLINE | AI MONITOR ACTIVE</>}
        </div>
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <div className={`brand ${isLeakDetected ? 'alert' : ''}`}>AirGuard AI</div>
        <div className="sys-status-wrapper">
          <div className="timestamp">Last Updated: {lastUpdated} sec ago</div>
        </div>
      </nav>

      {/* Main grid layout */}
      <main className="main-dashboard">

        {/* AREA: sensor — left column, spans all rows */}
        <div className="area-sensor panel">
          <div className="panel-title">Live Sensor Data</div>
          <div className="sensor-cards">
            {currentSensors ? (<>
              <SensorCard name="MAF" value={currentSensors.MAF} unit="g/s" isAlert={isLeakDetected} prevValue={prevSensors?.MAF || 0} />
              <SensorCard name="MAP" value={currentSensors.MAP} unit="kPa" isAlert={isLeakDetected && (isIntakeLeak || isCACLeak)} prevValue={prevSensors?.MAP || 0} />
              <SensorCard name="EBP" value={currentSensors.EBP} unit="kPa" isAlert={isLeakDetected && isExhaustLeak} prevValue={prevSensors?.EBP || 0} />
              <SensorCard name="EGT" value={currentSensors.EGT} unit="°C" isAlert={isLeakDetected && (isExhaustLeak || isCACLeak || isIntakeLeak)} prevValue={prevSensors?.EGT || 0} />
              <SensorCard name="Lambda" value={currentSensors.Lambda} unit="λ" isAlert={isLeakDetected} prevValue={prevSensors?.Lambda || 0} />
            </>) : (
              <div className="empty-state">
                {sensorError ?? 'Waiting for live sensor data...'}
              </div>
            )}
          </div>
        </div>

        {/* AREA: flow — center top */}
        <div className="area-flow panel">
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
              <div className="flow-node">Engine</div>
              <div className={`flow-line ${isLeakDetected ? 'alert' : ''}`}></div>
              <div className={`flow-node ${isExhaustLeak ? 'alert alert-pulse' : ''}`}>
                {isExhaustLeak && <div className="leak-label alert-shake">Leak Detected Here</div>}
                Exhaust
              </div>
            </div>

          </div>
        </div>

        {/* AREA: decision — right column, spans all rows */}
        <div className="area-decision panel">
          <div className="panel-title">AI Decision Output</div>
          <div className={`decision-panel ${isLeakDetected ? 'alert alert-pulse' : ''}`}>
            <div className="status-display">
              {isLeakDetected
                ? <ShieldAlert size={44} className="alert-text-blink" color="var(--accent-red)" />
                : <CheckCircle size={44} color="var(--success-green)" />}
              <div className={`status-value ${isLeakDetected ? 'alert' : 'normal'}`}>
                {isLeakDetected ? 'LEAK DETECTED' : 'NO LEAK'}
              </div>
            </div>
            <div className="decision-details">
              <div className="detail-row">
                <span className="detail-label">Model Predicts:</span>
                <span className="detail-value" style={{ color: isLeakDetected ? 'var(--accent-red)' : '' }}>{prediction.leak_type_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Confidence:</span>
                <span className="detail-value">{prediction.confidence}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Action:</span>
                <span className="detail-value">{prediction.action}</span>
              </div>
            </div>
            <button className={`cta-button ${isLeakForced ? 'reset' : ''}`} onClick={handleRunDetection} disabled={isScanning}>
              {isScanning ? 'Testing Scenario...' : isLeakForced ? 'RESET SYSTEM' : 'TRIGGER RANDOM LEAK'}
            </button>
          </div>
        </div>

        {/* AREA: chart — center middle */}
        <div className="area-chart panel">
          <div className="panel-title" style={{ borderBottom: 'none' }}>Sensor Trends (MAP, MAF &amp; EBP)</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="time" stroke="#888" fontSize={12} tickMargin={10} />
                <YAxis yAxisId="left" stroke="var(--text-main)" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} />
                <Legend verticalAlign="top" height={36} />

                {leakEvents.map(event => {
                  const firstTime = historicalData.length > 0 ? historicalData[0].time : null;
                  const lastTime = historicalData.length > 0 ? historicalData[historicalData.length - 1].time : null;
                  const inWindow = (t: string) => historicalData.some(d => d.time === t);
                  const showLine = inWindow(event.startTime);
                  const startIdx = historicalData.findIndex(d => d.time === event.startTime);
                  const endIdx = event.endTime ? historicalData.findIndex(d => d.time === event.endTime) : historicalData.length - 1;
                  const showArea = startIdx !== -1 || endIdx !== -1 || (event.startTime < (firstTime || '') && (!event.endTime || event.endTime > (lastTime || '')));
                  return (
                    <g key={`leak-viz-${event.id}`}>
                      {showLine && <ReferenceLine x={event.startTime} stroke="var(--accent-red)" strokeDasharray="5 5" label={{ value: 'Leak', position: 'top', fill: 'var(--accent-red)', fontSize: 10, fontWeight: 'bold' }} />}
                      {showArea && <ReferenceArea x1={startIdx !== -1 ? event.startTime : (firstTime || '')} x2={endIdx !== -1 ? (event.endTime || lastTime || '') : (lastTime || '')} fill="var(--accent-red)" fillOpacity={0.2} stroke="none" />}
                    </g>
                  );
                })}

                <Line yAxisId="left" type="monotone" dataKey="MAP" stroke="var(--accent-red)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="left" type="monotone" dataKey="EBP" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="MAF" stroke="var(--success-green)" strokeWidth={2} dot={false} isAnimationActive={false} />

                {historicalData.length > 0 && (<>
                  {historicalData.length > 5 && (
                    <ReferenceLine x={historicalData[historicalData.length - 6].time} stroke="#ff00ff" strokeWidth={3} strokeDasharray="3 3"
                      label={{ value: 'AI ANALYSIS', position: 'insideBottomLeft', fill: '#ff00ff', fontSize: 11, fontWeight: 'bold' }} />
                  )}
                  <ReferenceLine x={historicalData[historicalData.length - 1].time} stroke="#ffffff" strokeWidth={3}
                    label={{ value: 'LIVE', position: 'insideTopRight', fill: '#ffffff', fontSize: 11, fontWeight: 'bold' }} />
                </>)}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel-subtitle">Leak Event History ({leakEvents.length} events)</div>
          <LeakDataTable events={leakEvents} />
        </div>

      </main>
    </div>
  );
}
