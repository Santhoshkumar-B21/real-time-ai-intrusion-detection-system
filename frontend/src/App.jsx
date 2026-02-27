import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const getSeverity = (risk) => {
  if (risk >= 86) return "CRITICAL";
  if (risk >= 61) return "HIGH";
  if (risk >= 31) return "MEDIUM";
  return "LOW";
};
  const [logs, setLogs] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [distribution, setDistribution] = useState({});
  const [spikeAlert, setSpikeAlert] = useState(false);

  const COLORS = ["#00C49F", "#FF8042", "#FF4444", "#8884d8"];

  // ---------------- INITIAL LOAD ----------------
  const fetchInitialData = async () => {
    const logsRes = await axios.get("http://127.0.0.1:8000/logs");
    const analyticsRes = await axios.get("http://127.0.0.1:8000/analytics");
    const distRes = await axios.get("http://127.0.0.1:8000/distribution");

    setLogs(logsRes.data);
    setAnalytics(analyticsRes.data);
    setDistribution(distRes.data);

    // 🔥 Initialize risk chart from existing logs
    const initialRisk = logsRes.data
      .slice(0, 20)
      .reverse()
      .map((log) => ({
        time: new Date(log.timestamp).toLocaleTimeString(),
        risk: Number(log.risk_score)
      }));

    console.log("Initial Risk Data:", initialRisk);
    setRiskData(initialRisk);
  };

 useEffect(() => {
  let socket;

  const connectWebSocket = () => {
    socket = new WebSocket("ws://127.0.0.1:8000/ws");

    socket.onopen = () => {
      console.log("✅ WebSocket Connected");
    };

    socket.onmessage = (event) => {
      const newLog = JSON.parse(event.data);

      console.log("📡 New Log:", newLog);

      // Update Logs
      setLogs(prev => [
        {
          id: prev.length + 1,
          ...newLog
        },
        ...prev
      ]);

      // Update Risk Chart
      setRiskData(prev => [
        ...prev.slice(-20),
        {
          time: new Date().toLocaleTimeString(),
          risk: Number(newLog.risk_score)
        }
      ]);

      // Update Analytics
      setAnalytics(prev => ({
        ...prev,
        total_logs: (prev.total_logs || 0) + 1,
        total_anomalies:
          (prev.total_anomalies || 0) +
          (newLog.anomaly === 1 ? 1 : 0)
      }));

      // Update Distribution
      setDistribution(prev => ({
        ...prev,
        [newLog.attack_type]:
          (prev[newLog.attack_type] || 0) + 1
      }));
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket Error:", err);
    };

    socket.onclose = () => {
      console.log("🔄 WebSocket Reconnecting...");
      setTimeout(connectWebSocket, 2000);
    };
  };

  connectWebSocket();

  return () => socket && socket.close();
}, []);

  // 🔥 DEBUG PRINT
  console.log("Current Risk Data State:", riskData);

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial",
        backgroundColor: "#0f172a",
        color: "white",
        minHeight: "100vh"
      }}
    >
      <h1>AI Intrusion Detection Dashboard</h1>

      {analytics.total_anomalies > 0 && (
  <div className="alert-banner">
    ⚠ CRITICAL ALERT: Anomalous Activity Detected!
  </div>
)}

{spikeAlert && (
  <div className="spike-banner">
    ⚠ RISK SPIKE DETECTED!
  </div>
)}

      <h2>Analytics</h2>
      <p>Total Logs: {analytics.total_logs}</p>
      <p>Total Anomalies: {analytics.total_anomalies}</p>
      <p>Average Risk: {analytics.average_risk_score}</p>
      <p>Most Frequent Attack: {analytics.most_frequent_attack}</p>

     <h2>Live Risk Trend</h2>

<div style={{ width: "100%", height: "300px" }}>
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={riskData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" />
      <YAxis domain={[0, 100]} />
      <Tooltip />
      <Line
  type="monotone"
  dataKey="risk"
  stroke="#ff0000"
  strokeWidth={3}
  dot={false}
  isAnimationActive={true}
/>
    </LineChart>
  </ResponsiveContainer>
</div>

      <h2>Attack Distribution</h2>
      <PieChart width={400} height={300}>
        <Pie
          data={Object.entries(distribution).map(([key, value]) => ({
            name: key,
            value: value
          }))}
          dataKey="value"
          nameKey="name"
          outerRadius={100}
          label
        >
          {Object.entries(distribution).map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      <h2>Recent Logs</h2>
      <table border="1" cellPadding="5">
        <thead>
  <tr>
    <th>ID</th>
    <th>Time</th>
    <th>Anomaly</th>
    <th>Attack</th>
    <th>Risk</th>
    <th>Severity</th>
  </tr>
</thead>
        <tbody>
          {logs.map((log, index) => (
            <tr
              key={index}
              style={{
                backgroundColor:
                  log.anomaly === 1 ? "#3b0000" : "transparent"
              }}
            >
              <td>{log.id}</td>
              <td>{log.timestamp}</td>
              <td
                style={{
                  color:
                    log.anomaly === 1
                      ? "#ff4d4d"
                      : "#00ff99",
                  fontWeight: "bold"
                }}
              >
                {log.anomaly === 1 ? "ATTACK" : "NORMAL"}
              </td>
              <td>{log.attack_type}</td>
              <td
                style={{
                  color:
                    log.risk_score > 70
                      ? "#ff4d4d"
                      : log.risk_score > 40
                      ? "#ffa500"
                      : "#00ff99",
                  fontWeight: "bold"
                }}
              >
                {log.risk_score}
              </td>
              <td>
  <span className={`severity ${getSeverity(log.risk_score)}`}>
    {getSeverity(log.risk_score)}
  </span>
</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;