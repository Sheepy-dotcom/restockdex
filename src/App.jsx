import { useEffect, useRef, useState } from "react";
import "./App.css";
import logo from "./assets/restockdex-logo.png";

const API_URL = "https://restockdex-production.up.railway.app";

function App() {
  const products = [
    "Booster Packs",
    "Booster Bundles",
    "Booster Boxes",
    "Elite Trainer Boxes",
    "Tins",
    "Collections",
    "Pokémon Center Drops",
  ];

  const [liveData, setLiveData] = useState([]);
  const [trafficData, setTrafficData] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [postcode, setPostcode] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    } catch (error) {
      console.error("Sound error:", error);
    }
  }

  async function fetchStock() {
    try {
      const res = await fetch(`${API_URL}/stock`);
      const data = await res.json();
      setLiveData(data);
    } catch (error) {
      console.error("Stock error:", error);
    }
  }

  async function fetchTraffic() {
    try {
      const res = await fetch(`${API_URL}/pokemon-center-traffic`);
      const data = await res.json();
      const traffic = data[0];

      setTrafficData(traffic);

      const highTraffic =
        traffic?.stock?.includes("POSSIBLE DROP") ||
        traffic?.stock?.includes("HIGH TRAFFIC");

      if (highTraffic && !alertedRef.current) {
        alertedRef.current = true;
        setShowTrafficAlert(true);
        playAlertSound();

        setTimeout(() => {
          setShowTrafficAlert(false);
        }, 12000);
      }

      if (!highTraffic) {
        alertedRef.current = false;
      }
    } catch (error) {
      console.error("Traffic error:", error);
    }
  }

  function toggleProduct(product) {
    setSelectedProducts((current) =>
      current.includes(product)
        ? current.filter((p) => p !== product)
        : [...current, product]
    );
  }

  const isHighTraffic =
    trafficData?.stock?.includes("POSSIBLE DROP") ||
    trafficData?.stock?.includes("HIGH TRAFFIC");

  const filteredLiveData =
    selectedProducts.length === 0
      ? liveData
      : liveData.filter((item) =>
          selectedProducts.some(
            (product) =>
              item.product?.toLowerCase().includes(product.toLowerCase()) ||
              item.store?.toLowerCase().includes(product.toLowerCase())
          )
        );

  return (
    <div className="page">
      {showTrafficAlert && (
        <div className="trafficPopup">
          <h3>🚨 Pokémon Center Traffic Spike</h3>
          <p>Possible drop or queue detected. Check Pokémon Center now.</p>

          <a
            href="https://www.pokemoncenter.com/en-gb/category/new-releases"
            target="_blank"
            className="popupButton"
          >
            Open Pokémon Center
          </a>

          <button
            className="popupClose"
            onClick={() => setShowTrafficAlert(false)}
          >
            Close
          </button>
        </div>
      )}

      <div className="app">
        <div className="logoContainer">
          <img src={logo} alt="RestockDex" className="logoImg" />
        </div>

        <header className="topbar">
          <div>
            <p className="eyebrow">UK Pokémon TCG Drop Monitor</p>
            <p className="subtitle">
              Live Pokémon drops, store tracking and Pokémon Center traffic alerts.
            </p>
          </div>

          <div className="statusBox">
            <span className="statusDot"></span>
            Live
          </div>
        </header>

        <section className="panel trafficPanel">
          <div className="panelHeader centeredHeader">
            <h2>Pokémon Center Traffic</h2>

            <span className={isHighTraffic ? "pill danger" : "pill success"}>
              {isHighTraffic ? "High Traffic" : "Low Traffic"}
            </span>
          </div>

          <div className={`trafficCard centered ${isHighTraffic ? "high" : "low"}`}>
            <h3>
              {!trafficData
                ? "🟡 Monitor Starting"
                : isHighTraffic
                ? "🚨 Possible Drop"
                : "🟢 Normal Activity"}
            </h3>

            <p className="trafficText">
              {trafficData
                ? trafficData.stock
                : "Monitor active — checking every 60 seconds"}
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
          <h2>Filters</h2>

          <input
            className="input"
            placeholder="Postcode e.g. OX4 2AB"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          />

          <div className="dropdown">
            <button
              className="dropdownButton"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Select Products {dropdownOpen ? "▲" : "▼"}
            </button>

            {dropdownOpen && (
              <div className="dropdownMenu">
                {products.map((product) => (
                  <label key={product} className="dropdownItem">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product)}
                      onChange={() => toggleProduct(product)}
                    />
                    {product}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="chips">
            {selectedProducts.length === 0 ? (
              <span className="emptyChip">No filters selected</span>
            ) : (
              selectedProducts.map((product) => (
                <span className="chip" key={product}>
                  {product}
                </span>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>Live Drops</h2>
            <span className="countBadge">{filteredLiveData.length} items</span>
          </div>

          <div className="dropList">
            {filteredLiveData.map((item, index) => {
              const isNew = item.stock?.includes("NEW DROP");

              return (
                <div
                  key={index}
                  className={isNew ? "dropCard newDrop" : "dropCard"}
                >
                  <div>
                    <span className="store">{item.store}</span>
                    <h3>{item.product}</h3>
                    <span className={isNew ? "pill danger" : "pill neutral"}>
                      {item.stock}
                    </span>
                  </div>

                  <a href={item.link} target="_blank" className="viewButton">
                    View
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;