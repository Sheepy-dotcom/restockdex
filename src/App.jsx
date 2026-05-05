import { useEffect, useState } from "react";
import "./App.css";

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
  const [postcode, setPostcode] = useState(
    localStorage.getItem("restockdex_postcode") || ""
  );
  const [savedPostcode, setSavedPostcode] = useState(
    localStorage.getItem("restockdex_postcode") || ""
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchStock();
    fetchTraffic();

    const interval = setInterval(() => {
      fetchStock();
      fetchTraffic();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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
      setTrafficData(data[0]);
    } catch (error) {
      console.error("Traffic error:", error);
    }
  }

  function savePostcode() {
    if (!postcode.trim()) {
      alert("Please enter a postcode.");
      return;
    }

    const cleanPostcode = postcode.trim().toUpperCase();

    localStorage.setItem("restockdex_postcode", cleanPostcode);
    setPostcode(cleanPostcode);
    setSavedPostcode(cleanPostcode);
  }

  function toggleProduct(product) {
    setSelectedProducts((current) =>
      current.includes(product)
        ? current.filter((p) => p !== product)
        : [...current, product]
    );
  }

  const isHighTraffic = trafficData?.stock?.includes("POSSIBLE DROP");

  return (
    <div className="page">
      <div className="app">
        <header className="hero">
          <h1 className="textLogo">RestockDex</h1>
          <p className="eyebrow">UK Pokémon TCG Drop Monitor</p>
          <p className="subtitle">
            Live Pokémon drops, store tracking and Pokémon Center traffic alerts.
          </p>
          <div className="statusBox">
            <span className="statusDot"></span>
            Live Monitoring
          </div>
        </header>

        <section className="trafficSection">
          <div className="trafficPanel">
            <h2>Pokémon Center Traffic</h2>

            <span className={isHighTraffic ? "pill danger" : "pill success"}>
              {isHighTraffic ? "High Traffic" : "Low Traffic"}
            </span>

            <div className={`trafficCard ${isHighTraffic ? "high" : "low"}`}>
              <h3>
                {!trafficData
                  ? "🟡 Monitor Starting"
                  : isHighTraffic
                  ? "🚨 Possible Drop"
                  : "🟢 Normal Activity"}
              </h3>

              <p>
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
          </div>
        </section>

        <section className="panel">
          <h2>Filters</h2>

          <input
            className="input"
            placeholder="Enter postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          />

          <button className="saveButton" onClick={savePostcode}>
            Save Postcode
          </button>

          {savedPostcode && (
            <p className="savedPostcode">
              Tracking near <strong>{savedPostcode}</strong>
            </p>
          )}

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
        </section>

        <section className="panel">
          <h2>Live Drops</h2>

          <div className="dropList">
            {liveData.map((item, index) => {
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