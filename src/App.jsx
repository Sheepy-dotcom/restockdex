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
    fetchStock();
    fetchTraffic();

    const interval = setInterval(() => {
      fetchStock();
      fetchTraffic();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  function playAlertSound() {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 880;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.6
      );

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch {}
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

      const high =
        traffic?.stock?.includes("POSSIBLE DROP") ||
        traffic?.stock?.includes("HIGH TRAFFIC");

      if (high && !alertedRef.current) {
        alertedRef.current = true;
        setShowTrafficAlert(true);
        playAlertSound();

        setTimeout(() => setShowTrafficAlert(false), 12000);
      }

      if (!high) alertedRef.current = false;
    } catch {}
  }

  const isHigh =
    trafficData?.stock?.includes("POSSIBLE DROP") ||
    trafficData?.stock?.includes("HIGH TRAFFIC");

  return (
    <div className="page">
      {showTrafficAlert && (
        <div className="trafficPopup">
          <h3>🚨 Pokémon Center Traffic Spike</h3>
          <p>Possible drop detected — check now.</p>
          <a
            href="https://www.pokemoncenter.com/en-gb/category/new-releases"
            target="_blank"
            className="popupButton"
          >
            Open Pokémon Center
          </a>
        </div>
      )}

      <div className="app">

        {/* 🔥 NEW LOGO */}
        <div className="logoContainer">
          <img src={logo} alt="RestockDex" className="logoImg" />
        </div>

        <section className="panel">
          <h2>Pokémon Center Traffic</h2>

          <div className={`trafficCard ${isHigh ? "high" : "low"}`}>
            <h3>
              {!trafficData
                ? "🟡 Starting"
                : isHigh
                ? "🚨 Possible Drop"
                : "🟢 Normal"}
            </h3>

            <p>
              {trafficData
                ? trafficData.stock
                : "Checking every 60 seconds"}
            </p>

            <a
              href="https://www.pokemoncenter.com/en-gb/category/new-releases"
              target="_blank"
              className="viewButton"
            >
              Open Pokémon Center
            </a>
          </div>
        </section>

        <section className="panel">
          <h2>Live Drops</h2>

          {liveData.map((item, i) => (
            <div key={i} className="dropCard">
              <div>
                <span className="store">{item.store}</span>
                <h3>{item.product}</h3>
                <span className="pill">{item.stock}</span>
              </div>

              <a href={item.link} target="_blank" className="viewButton">
                View
              </a>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default App;