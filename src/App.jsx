import { useEffect, useMemo, useState } from "react";
import "./App.css";
import logo from "./assets/restockdex-logo.png";
import pokemonCenterLogo from "./assets/pokemon-center-white.png";

const API_URL =
  import.meta.env.VITE_API_URL || "https://restockdex-production.up.railway.app";

const SHOP_LINKS = [
  {
    name: "Argos",
    link: "https://www.argos.co.uk/search/pokemon-cards/",
  },
  {
    name: "Amazon UK",
    link: "https://www.amazon.co.uk/s?k=pokemon+trading+card+game&i=toys",
  },
  {
    name: "Smyths Toys",
    link: "https://www.smythstoys.com/uk/en-gb/brand/pokemon/pokemon-trading-card-game/c/SM0601011202",
  },
  {
    name: "Chaos Cards",
    link: "https://www.chaoscards.co.uk/search?type=product&q=pokemon",
  },
];

const AMAZON_NEW_LINKS = [
  {
    name: "Newest Pokemon TCG",
    link: "https://www.amazon.co.uk/s?k=pokemon+trading+card+game&i=toys&s=date-desc-rank",
  },
  {
    name: "Booster bundles",
    link: "https://www.amazon.co.uk/s?k=pokemon+booster+bundle&i=toys&s=date-desc-rank",
  },
  {
    name: "Elite trainer boxes",
    link: "https://www.amazon.co.uk/s?k=pokemon+elite+trainer+box&i=toys&s=date-desc-rank",
  },
];

const STORE_ORDER = [
  "The Card Vault",
  "Magic Madhouse",
  "Argos",
  "Amazon UK",
  "Chaos Cards",
  "Smyths Toys",
];

function App() {
  const [liveData, setLiveData] = useState([]);
  const [trafficData, setTrafficData] = useState(null);
  const [shopStatus, setShopStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll() {
    try {
      setError("");

      const [stockRes, trafficRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/stock`),
        fetch(`${API_URL}/pokemon-center-traffic`),
        fetch(`${API_URL}/status`),
      ]);

      const stock = await stockRes.json();
      const traffic = await trafficRes.json();
      const status = await statusRes.json();

      setLiveData(Array.isArray(stock) ? stock : []);
      setTrafficData(Array.isArray(traffic) ? traffic[0] : null);
      setShopStatus(Array.isArray(status?.shops) ? status.shops : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("RestockDex fetch failed:", err);
      setError("Could not connect to the RestockDex API.");
    } finally {
      setLoading(false);
    }
  }

  const groupedStores = useMemo(() => {
    return STORE_ORDER.map((store) => ({
      store,
      items: liveData.filter((item) => item.store?.includes(store)),
      status: shopStatus.find((shop) => shop.store === store),
    }));
  }, [liveData, shopStatus]);

  const newDrops = liveData.filter((item) => item.stock?.includes("NEW"));
  const hotDrops = liveData.filter((item) => item.alert?.includes("KEYWORD"));
  const highTraffic = trafficData?.stock?.includes("HIGH");

  return (
    <div className="page">
      <div className="app">
        <header className="heroPanel">
          <img src={logo} className="logoImg" alt="RestockDex" />

          <div className="heroText">
            <p>
              Live Pokemon stock checks for Magic Madhouse, The Card Vault,
              Chaos Cards, Argos, Amazon UK, Smyths Toys, and Pokemon Center
              traffic.
            </p>
          </div>

          <button className="refreshButton" onClick={fetchAll} type="button">
            Refresh now
          </button>
        </header>

        <section className="panel trafficPanel">
          <div className="trafficHeader">
            <img
              src={pokemonCenterLogo}
              className="pokemonCenterLogo"
              alt="Pokemon Center"
            />
            <div>
              <p className="eyebrow">Traffic alert</p>
            </div>
            <span className={highTraffic ? "statusBadge danger" : "statusBadge"}>
              {highTraffic ? "High traffic" : "Normal"}
            </span>
          </div>

          <div className={highTraffic ? "trafficCard high" : "trafficCard low"}>
            <h3>{trafficData?.stock || "Checking traffic..."}</h3>
            <p>
              Status: {trafficData?.httpStatus || "Checking"} | Response:{" "}
              {trafficData?.responseTime || "Checking"}
            </p>
            <span className="refreshNote">Refreshes automatically every 60 seconds</span>
          </div>
        </section>

        <section className="statsGrid">
          <StatCard label="Products tracked" value={liveData.length} />
          <StatCard label="New drops" value={newDrops.length} />
          <StatCard label="Hot matches" value={hotDrops.length} />
        </section>

        {error && <div className="errorBox">{error}</div>}

        <section className="feedPanel">
          <div className="feedHeader">
            <div>
              <p className="eyebrow">Live feed</p>
              <h2>Shop drops</h2>
            </div>
            <span className="countBadge">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Checking"}
            </span>
          </div>

          <div className="shopGrid">
            {groupedStores.map(({ store, items, status }) => (
              <StoreSection
                key={store}
                store={store}
                items={items}
                status={status}
                loading={loading}
              />
            ))}
          </div>
        </section>

        <section className="panel amazonPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Amazon UK</p>
              <h2>New product links</h2>
            </div>
            <span className="shopStatus error">Links only</span>
          </div>

          <div className="quickLinks">
            {AMAZON_NEW_LINKS.map((item) => (
              <a
                key={item.name}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="viewButton"
              >
                {item.name}
              </a>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Manual checks</p>
              <h2>Quick shop links</h2>
            </div>
          </div>

          <div className="quickLinks">
            {SHOP_LINKS.map((shop) => (
              <a
                key={shop.name}
                href={shop.link}
                target="_blank"
                rel="noreferrer"
                className="viewButton"
              >
                Check {shop.name}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StoreSection({ store, items, status, loading }) {
  const hasItems = items.length > 0;
  const hasError = status?.status === "error";
  const needsSetup = status?.status === "setup_needed";
  const statusLabel = loading
    ? "Checking"
    : needsSetup
    ? "API needed"
    : hasError
    ? "Blocked"
    : "Online";
  const emptyMessage = loading
    ? "Checking stock..."
    : needsSetup
    ? "Automatic alerts need official Amazon API credentials."
    : hasError
    ? "This shop blocked the automatic check. Use the manual link below."
    : "No confirmed in-stock drops right now.";

  return (
    <details
      className={`storeSection ${hasItems ? "hasDrops" : ""} ${
        hasError || needsSetup ? "hasError" : ""
      }`}
      open={hasItems}
    >
      <summary className="storeHeader">
        <div>
          <p className="storeKicker">{statusLabel}</p>
          <h3>{store}</h3>
        </div>
        <span
          className={`shopStatus ${
            hasError || needsSetup ? "error" : loading ? "checking" : "online"
          }`}
        >
          {statusLabel}
        </span>
        <span className={hasItems ? "shopCount active" : "shopCount"}>
          {items.length} found
        </span>
      </summary>

      {items.length === 0 && (
        <p className={hasError || needsSetup ? "emptyText error" : "emptyText"}>
          {emptyMessage}
        </p>
      )}

      <div className="dropList">
        {items.map((item, index) => (
          <DropCard key={`${item.store}-${item.product}-${index}`} item={item} />
        ))}
      </div>
    </details>
  );
}

function DropCard({ item }) {
  const isNew = item.stock?.includes("NEW");
  const isHot = item.alert?.includes("KEYWORD");

  return (
    <div className={`dropCard ${isNew ? "newDrop" : ""} ${isHot ? "keywordDrop" : ""}`}>
      <div>
        <span className="store">{item.store}</span>
        <h3>{item.product}</h3>

        <div className="badges">
          {isNew && <span className="pill danger">NEW</span>}
          {isHot && <span className="pill gold">HOT</span>}
          {!isNew && !isHot && <span className="pill neutral">Seen</span>}
        </div>
      </div>

      <a href={item.link} target="_blank" rel="noreferrer" className="viewButton">
        View
      </a>
    </div>
  );
}

export default App;
