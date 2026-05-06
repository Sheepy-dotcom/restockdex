import { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./assets/restockdex-logo.png";

const API_URL = "https://restockdex-production.up.railway.app";

function App() {
  const [liveData, setLiveData] = useState([]);
  const [trafficData, setTrafficData] = useState(null);
  const [showTrafficAlert, setShowTrafficAlert] = useState(false);

  const alertedRef = useRef(false);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  function playAlertSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 900;
      gain.gain.value = 0.2;

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  async function fetchAll() {
    fetchStock();
    fetchTraffic();
  }

  async function fetchStock() {
    try {
      const res = await fetch(`${API_URL}/stock`);
      const data = await res.json();
      setLiveData(data);
    } catch {}
  }

  async function fetchTraffic() {
    try {
      const res = await fetch(`${API_URL}/pokemon-center-traffic`);
      const data = await res.json();
      const traffic = data[0];

      setTrafficData(traffic);

      const high = traffic?.stock.includes("HIGH TRAFFIC");

      if (high && !alertedRef.current) {
        alertedRef.current = true;
        setShowTrafficAlert(true);
        playAlertSound();

        setTimeout(() => setShowTrafficAlert(false), 10000);
      }

      if (!high) alertedRef.current = false;
    } catch {}
  }

  const isHigh = trafficData?.stock.includes("HIGH");

  return (
    <div className="page">
      {showTrafficAlert && (
        <div className="trafficPopup">
          <h3>🚨 Traffic Spike Detected</h3>
          <p>Possible drop incoming. Check now.</p>
        </div>
      )}

      <div className="app">

        <div className="logoContainer">
          <img src={logo} className="logoImg" />
        </div>

        {/* TRAFFIC */}
        <section className="panel">
          <h2>Pokémon Center Traffic</h2>

          <div className={`trafficCard ${isHigh ? "high" : "low"}`}>
            <h3>
              {!trafficData
                ? "Checking..."
                : isHigh
                ? "🚨 Possible Drop"
                : "🟢 Normal"}
            </h3>

            <p>{trafficData?.stock}</p>
          </div>
        </section>

        {/* DROPS */}
        <section className="panel">
          <h2>Live Drops</h2>

          {liveData.map((item, i) => {
            const isNew = item.stock.includes("NEW");
            const isKeyword = item.alert?.includes("KEYWORD");

            return (
              <div
                key={i}
                className={`dropCard 
                  ${isNew ? "newDrop" : ""} 
                  ${isKeyword ? "keywordDrop" : ""}
                `}
              >
                <div>
                  <span className="store">{item.store}</span>

                  <h3>{item.product}</h3>

                  <div className="badges">
                    {isNew && <span className="pill danger">NEW 🚨</span>}
                    {isKeyword && <span className="pill gold">HOT 🔥</span>}
                  </div>
                </div>

                <a href={item.link} target="_blank" className="viewButton">
                  View
                </a>
              </div>
            );
          })}
        </section>

      </div>
    </div>
  );
}

export default App;