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
  Legend,
  BarChart,
  Bar
} from "recharts";

import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";
import GaugeChart from "react-gauge-chart";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
} from "react-simple-maps"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
function App() {

  // ---------------- SEVERITY LOGIC ----------------
  const getSeverity = (risk) => {
    if (risk >= 86) return "CRITICAL";
    if (risk >= 61) return "HIGH";
    if (risk >= 31) return "MEDIUM";
    return "LOW";
  };

  // ---------------- STATES ----------------
  const [logs, setLogs] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [distribution, setDistribution] = useState({});
  const [spikeAlert, setSpikeAlert] = useState(false);
  const [attackCount, setAttackCount] = useState(0);

  const COLORS = [
    "#00C49F",
    "#FF8042",
    "#FF4444",
    "#8884d8",
    "#ffc658",
    "#00bcd4"
  ];
  const [showHighRisk, setShowHighRisk] = useState(false);

  // ---------------- INITIAL DATA LOAD ----------------
  const fetchInitialData = async () => {
    try {

      const logsRes = await axios.get("http://127.0.0.1:8000/logs");
      const analyticsRes = await axios.get("http://127.0.0.1:8000/analytics");
      const distRes = await axios.get("http://127.0.0.1:8000/distribution");

      const logsArray = Array.isArray(logsRes.data) ? logsRes.data : [];

      setLogs(logsArray);
      setAnalytics(analyticsRes.data || {});
      const distData = distRes.data || {};
const normalizedDist = Object.fromEntries(
  Object.entries(distData).map(([k, v]) => [k, Number(v) || 0])
);

setDistribution(normalizedDist);

     const initialRisk = (logsRes.data || [])
  .slice(0, 20)
  .reverse()
  .map((log, index) => {

    const time = log.timestamp
      ? new Date(log.timestamp.replace(" ", "T")).toLocaleTimeString()
      : `T${index}`;

    const risk = parseFloat(log.risk_score) || 0;

    return { time, risk };

  });

setRiskData(initialRisk);
    } catch (err) {
      console.error("Initial fetch error:", err);
    }
  };

  // ---------------- HIGH RISK FILTER ----------------
 const fetchHighRisk = async () => {
  try {
    const res = await axios.get("http://127.0.0.1:8000/logs?min_risk=80");
    setLogs(Array.isArray(res.data) ? res.data : []);
    setShowHighRisk(true);
  } catch (err) {
    console.error("High risk fetch error:", err);
  }
};

  const resetLogs = () => {
    fetchInitialData();
    setShowHighRisk(false);
  };

  // ---------------- WEBSOCKET ----------------
  useEffect(() => {

    fetchInitialData();

    let socket;

    const connectWebSocket = () => {

      socket = new WebSocket("ws://127.0.0.1:8000/ws");

      socket.onopen = () => {
        console.log("WebSocket connected");
      };

      socket.onmessage = (event) => {
        const newLog = JSON.parse(event.data);
        if (newLog.anomaly === 1) {
  setAttackCount((prev) => prev + 1);
}
setRiskData((prev) => {

  const time = newLog.timestamp
    ? new Date(newLog.timestamp.replace(" ", "T")).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  const updated = [
    ...prev,
    {
      time,
      risk: Number(newLog.risk_score) || 0
    }
  ];

  return updated.slice(-20);

});
        // Update logs table
        setLogs((prev) => [
  {
    id: prev.length + 1,
    ...newLog,
    attack_type: newLog.attack_type || "normal"
  },
  ...prev
]);

        // Update risk chart
      setLogs((prev) => {

  const newEntry = {
    id: prev.length + 1,
    ...newLog,
    attack_type: newLog.attack_type || "normal"
  };

  if (showHighRisk && Number(newLog.risk_score) < 80) {
    return prev;
  }

  return [newEntry, ...prev];

});
        // Update analytics
        setAnalytics((prev) => {

          const totalLogs = (prev.total_logs || 0) + 1;

          const totalAnomalies =
            (prev.total_anomalies || 0) +
            (newLog.anomaly === 1 ? 1 : 0);

          const avg =
            ((prev.average_risk_score || 0) * (totalLogs - 1) +
              Number(newLog.risk_score || 0)) / totalLogs;

          return {
            ...prev,
            total_logs: totalLogs,
            total_anomalies: totalAnomalies,
            average_risk_score: avg.toFixed(2)
          };
        });

        // Update distribution
       setDistribution((prev) => {

  const attack = newLog.attack_type || "normal";

  return {
    ...prev,
    [attack]: (prev[attack] || 0) + 1
  };

});
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      socket.onclose = () => {
        console.log("WebSocket reconnecting...");
        setTimeout(connectWebSocket, 2000);
      };

    };

    connectWebSocket();

    return () => socket && socket.close();

  }, []);

  // ---------------- PIE DATA ----------------
const pieData = Object.entries(distribution || {})
  .map(([name, value]) => ({
    name,
    value: Number(value)
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 6);   // show only top 6
console.log("Risk Chart Data:", riskData);
console.log("PieData:", pieData);
console.log("Distribution:", distribution);
const barData = Object.entries(distribution || {})
  .map(([name, value]) => ({
    name,
    value: Number(value)
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 6);
  const attackLocations = [
  { name: "USA", coordinates: [-97, 38] },
  { name: "China", coordinates: [104, 35] },
  { name: "Russia", coordinates: [100, 60] },
  { name: "India", coordinates: [78, 21] },
  { name: "Germany", coordinates: [10, 51] }
];
const generatePDFReport = () => {

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("AI Intrusion Detection System Report", 14, 20);

  doc.setFontSize(12);
  doc.text(`Total Logs: ${analytics.total_logs}`, 14, 40);
  doc.text(`Total Anomalies: ${analytics.total_anomalies}`, 14, 50);
  doc.text(`Average Risk Score: ${analytics.average_risk_score}`, 14, 60);
  doc.text(`Most Frequent Attack: ${analytics.most_frequent_attack}`, 14, 70);

  const tableData = logs.slice(0, 20).map(log => [
    log.id,
    log.timestamp,
    log.anomaly === 1 ? "ATTACK" : "NORMAL",
    log.attack_type,
    log.risk_score
  ]);

  autoTable(doc, {
    startY: 90,
    head: [["ID", "Time", "Anomaly", "Attack Type", "Risk"]],
    body: tableData
  });

  doc.save("AI_IDS_Report.pdf");
};
  // ---------------- UI ----------------
  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#0f172a",
        color: "white",
        minHeight: "100vh",
        fontFamily: "Arial"
      }}
    >

      <h1>AI Intrusion Detection Dashboard</h1>

      {analytics.total_anomalies > 0 && (
        <div className="alert-banner">
          ⚠ CRITICAL ALERT: Anomalous Activity Detected!
        </div>
      )}

      {spikeAlert && (
  <div
    style={{
      backgroundColor: "#ff0000",
      color: "white",
      padding: "12px",
      textAlign: "center",
      fontWeight: "bold",
      animation: "flash 1s infinite"
    }}
  >
    🚨 CRITICAL ATTACK DETECTED 🚨
  </div>
)}
      {/* ---------------- ANALYTICS ---------------- */}
      <h2>Analytics</h2>

      <p>Total Logs: {analytics.total_logs || 0}</p>
      <p>Total Anomalies: {analytics.total_anomalies || 0}</p>
      <p>Average Risk: {analytics.average_risk_score || 0}</p>
      <p>Most Frequent Attack: {analytics.most_frequent_attack || "N/A"}</p>
      <h2 style={{ textAlign: "center" }}>Threat Level</h2>

<div style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}>
  <GaugeChart
    id="threat-gauge"
    nrOfLevels={20}
    percent={(analytics.average_risk_score || 0) / 100}
    arcPadding={0.02}
    colors={["#00ff99", "#ffa500", "#ff0000"]}
    textColor="#ffffff"
    needleColor="#ffffff"
    />
    <p style={{textAlign:"center",fontSize:"18px"}}>
Current Risk Score: {analytics.average_risk_score}
</p>
</div>
<h2 style={{ textAlign: "center", marginTop: "20px" }}>
Live Attack Counter
</h2>

<div
  style={{
    textAlign: "center",
    fontSize: "40px",
    fontWeight: "bold",
    color: "#ff4444"
  }}
>
{attackCount}
</div>

      {/* ---------------- LINE CHART ---------------- */}
      <h2>Live Risk Trend</h2>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height={350}>
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
  dot={{ r: 3 }}
  isAnimationActive={false}
/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ---------------- PIE CHART ---------------- */}
      <h2 style={{ textAlign: "center" }}>Attack Distribution</h2>

{pieData.length === 0 ? (
  <p style={{ color: "white", paddingTop: "10px", textAlign: "center" }}>
    Loading attack distribution...
  </p>
) : (
  <div
    style={{
      width: "100%",
      maxWidth: "700px",
      height: "420px",
      margin: "0 auto"
    }}
  >
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
  <Pie
    data={pieData}
    dataKey="value"
    nameKey="name"
    cx="50%"
    cy="50%"
    outerRadius={130}
    innerRadius={60}
    isAnimationActive={false}
    label={({ name, percent }) =>
      `${name} ${(percent * 100).toFixed(0)}%`
    }
  >
    {pieData.map((entry, index) => (
      <Cell
        key={`cell-${index}`}
        fill={COLORS[index % COLORS.length]}
      />
    ))}
  </Pie>
  <text
  x="50%"
  y="50%"
  textAnchor="middle"
  dominantBaseline="middle"
  style={{ fill: "white", fontSize: "18px", fontWeight: "bold" }}
>
  {Object.values(distribution).reduce((a, b) => a + b, 0)}
</text>

  <Tooltip />
  <Legend />
</PieChart>
    </ResponsiveContainer>
  </div>
)}
<h2 style={{ textAlign: "center", marginTop: "40px" }}>
  Top Attack Types
</h2>

<div
  style={{
    width: "100%",
    maxWidth: "700px",
    height: "350px",
    margin: "0 auto"
  }}
>
  <ResponsiveContainer width="100%" height="100%">
  <BarChart data={barData}>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis
      dataKey="name"
      stroke="#ffffff"
    />

    <YAxis
      stroke="#ffffff"
      domain={[0, "dataMax + 50"]}
    />

    <Tooltip />

    <Bar
      dataKey="value"
      fill="#00bcd4"
      radius={[6, 6, 0, 0]}
      barSize={40}
    />
  </BarChart>
</ResponsiveContainer>
</div>
<h2 style={{ textAlign: "center", marginTop: "40px" }}>
Global Attack Map
</h2>

<div
  style={{
    width: "100%",
    maxWidth: "800px",
    margin: "0 auto"
  }}
>
  <ComposableMap
    projectionConfig={{ scale: 140 }}
    style={{ width: "100%", height: "400px" }}
  >
    <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
      {({ geographies }) =>
        geographies.map((geo) => (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            fill="#1f2937"
            stroke="#334155"
          />
        ))
      }
    </Geographies>

    {attackLocations.map(({ name, coordinates }, index) => (
      <Marker key={index} coordinates={coordinates}>
        <circle r={6} fill="#ff0000" />
        <text
          textAnchor="middle"
          y={-10}
          style={{
            fill: "#ffffff",
            fontSize: "10px"
          }}
        >
          {name}
        </text>
      </Marker>
    ))}
  </ComposableMap>
</div>

      {/* ---------------- LOG TABLE ---------------- */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>

<button
  onClick={fetchHighRisk}
  style={{
    marginRight: "10px",
    padding: "8px 16px",
    backgroundColor: "#ff4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }}
>
Show High Risk
</button>

<button
  onClick={resetLogs}
  style={{
    padding: "8px 16px",
    backgroundColor: "#00bcd4",
    color: "black",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }}
>
Reset
</button>

<button
  onClick={generatePDFReport}
  style={{
    marginLeft: "10px",
    padding: "8px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }}
>
Download Report
</button>

</div>
      <br /><br />

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
             <td>
  {log.timestamp
    ? new Date(log.timestamp.replace(" ", "T")).toLocaleString()
    : new Date().toLocaleString()}
</td>

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

             <td>{log.attack_type || "normal"}</td>

              <td>

                <div className="risk-wrapper">

                  <div
                    className="risk-bar"
                    style={{
                      width: `${log.risk_score}%`,
                      backgroundColor:
                        log.risk_score >= 80
                          ? "#ff0000"
                          : log.risk_score >= 50
                          ? "#ffa500"
                          : "#00ff99"
                    }}
                  ></div>

                  <span className="risk-text">
                    {log.risk_score}
                  </span>

                </div>

              </td>

              <td>

                <span
                  className={`severity ${getSeverity(log.risk_score)}`}
                >
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