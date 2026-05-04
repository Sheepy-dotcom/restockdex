import { useEffect, useState } from "react";
import logo from "./assets/Logo.png";
import pcLogo from "./assets/pokemon-center.png";
import "./App.css";

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
      const res = await fetch("http://localhost:3001/stock");
      const data = await res.json();
      setLiveData(data);
    } catch (error) {
      console.error("Stock error:", error);
    }
  }

  async function fetchTraffic() {
    try {
      const res = await fetch("http://localhost:3001/pokemon-center-traffic");
      const data = await res.json();
      setTrafficData(data[0]);
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

  const isHighTraffic = trafficData?.stock?.includes("POSSIBLE DROP");

  return (
    <div className="page">
      <div className="app">

        {/* MAIN LOGO */}
        <div className="logoContainer">
          <img src={logo} alt="RestockDex Logo" className="logoImg" />
        </div>

        {/* HEADER */}
        <header className="topbar">
          <div>
            <p className="eyebrow">UK Pokémon TCG Drop Monitor</p>
            <p className="subtitle">
              Live Pokémon drops, store tracking and Pokémon Center alerts.
            </p>
          </div>

          <div className="statusBox">
            <span className="statusDot"></span>
            Live
          </div>
        </header>

        {/* POKEMON CENTER TRAFFIC */}
        <section className="panel">
          <div className="panelHeader">

            <div className="trafficHeader">
              <img src={pcLogo} alt="Pokemon Center" className="pcLogo" />
              <h2>Pokémon Center Traffic</h2>
            </div>

            <span className={isHighTraffic ? "pill danger" : "pill success"}>
              {isHighTraffic ? "High Traffic" : "Low Traffic"}
            </span>
          </div>

          <div className={isHighTraffic ? "trafficCard high" : "trafficCard low"}>
            <h3>{isHighTraffic ? "🚨 Possible Drop" : "🟢 Normal Activity"}</h3>
            <p>{trafficData?.stock || "Checking..."}</p>

            <a
              href="https://www.pokemoncenter.com/en-gb/category/new-releases"
              target="_blank"
              className="viewButton"
            >
              Open Pokémon Center
            </a>
          </div>
        </section>

        {/* FILTERS */}
        <section className="panel">
          <h2>Filters</h2>

          <input
            className="input"
            placeholder="Postcode"
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
        </section>

        {/* LIVE DROPS */}
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