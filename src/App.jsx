import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import logo from "./assets/restockdex-logo.png";
import pokemonCenterLogo from "./assets/pokemon-center.png";

const API_URL =
  import.meta.env.VITE_API_URL || "https://restockdex-production.up.railway.app";
const REFRESH_INTERVAL = 60000;

const STORE_ORDER = [
  "The Card Vault",
  "Magic Madhouse",
  "Chaos Cards",
  "Argos",
  "Smyths Toys",
];

const QUICK_LINKS = [
  {
    name: "Argos",
    href: "https://www.argos.co.uk/search/pokemon-cards/",
  },
  {
    name: "Smyths Toys",
    href: "https://www.smythstoys.com/uk/en-gb/search/?text=pokemon",
  },
  {
    name: "Chaos Cards",
    href: "https://www.chaoscards.co.uk/search?type=product&q=pokemon",
  },
  {
    name: "Pokemon Center",
    href: "https://www.pokemoncenter.com/en-gb/category/new-releases",
  },
];

function App() {
  const [liveData, setLiveData] = useState([]);
  const [trafficData, setTrafficData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showTrafficAlert, setShowTrafficAlert] = useState(false);

  const alertedRef = useRef(false);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const newDrops = liveData.filter((item) => item.stock?.includes("NEW"));
    const hotDrops = liveData.filter((item) => item.alert?.includes("KEYWORD"));

    return {
      total: liveData.length,
      newDrops: newDrops.length,
      hotDrops: hotDrops.length,
    };
  }, [liveData]);

  const groupedStores = useMemo(() => {
    return STORE_ORDER.map((store) => ({
      store,
      items: liveData.filter((item) => item.store?.includes(store)),
    }));
  }, [liveData]);

  function playAlertSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 900;
      gain.gain.value = 0.18;

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Browsers can block audio until the user interacts with the page.
    }
  }

  async function fetchAll() {
    setStatus((current) => (current === "ready" ? "refreshing" : "loading"));

    const [stockResult, trafficResult] = await Promise.allSettled([
      fetchStock(),
      fetchTraffic(),
    ]);

    if (stockResult.status === "rejected" && trafficResult.status === "rejected") {
      setStatus("error");
      return;
    }

    setStatus("ready");
    setLastUpdated(new Date());
  }

  async function fetchStock() {
    const res = await fetch(`${API_URL}/stock`);
    if (!res.ok) throw new Error("Could not load stock");

    const data = await res.json();
    setLiveData(Array.isArray(data) ? data : []);
  }

  async function fetchTraffic() {
    const res = await fetch(`${API_URL}/pokemon-center-traffic`);
    if (!res.ok) throw new Error("Could not load traffic");

    const data = await res.json();
    const traffic = Array.isArray(data) ? data[0] : null;

    setTrafficData(traffic);

    const high = traffic?.stock?.includes("HIGH TRAFFIC");

    if (high && !alertedRef.current) {
      alertedRef.current = true;
      setShowTrafficAlert(true);
      playAlertSound();

      setTimeout(() => setShowTrafficAlert(false), 10000);
    }

    if (!high) alertedRef.current = false;
  }

  const isHighTraffic = trafficData?.stock?.includes("HIGH");
  const statusLabel =
    status === "error"
      ? "Connection issue"
      : status === "refreshing"
        ? "Refreshing"
        : "Live monitor";
  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Checking";

  return (
    <main className="page">
      {showTrafficAlert && (
        <aside className="trafficPopup" role="alert">
          <strong>Traffic spike detected</strong>
          <span>Pokemon Center may be preparing a drop.</span>
        </aside>
      )}

      <div className="shell">
        <header className="hero">
          <nav className="navBar" aria-label="RestockDex status">
            <img src={logo} className="brandLogo" alt="RestockDex" />
            <div className={`statusPill status-${status}`}>
              <span className="statusDot" />
              {statusLabel}
            </div>
          </nav>

          <div className="heroGrid">
            <section className="heroCopy" aria-labelledby="page-title">
              <p className="eyebrow">UK Pokemon drop monitor</p>
              <h1 id="page-title">Fresh stock signals across the shops that matter.</h1>
              <p className="heroText">
                RestockDex watches live product feeds, flags new drops, and keeps an
                eye on Pokemon Center traffic so you can move quickly.
              </p>

              <div className="heroActions">
                <button className="primaryButton" type="button" onClick={fetchAll}>
                  Refresh now
                </button>
                <a className="secondaryButton" href="#drops">
                  View live feed
                </a>
              </div>
            </section>

            <section className="signalPanel" aria-label="Live monitor summary">
              <SignalStat label="Last scan" value={updatedLabel} />
              <SignalStat label="Tracked drops" value={metrics.total} />
              <SignalStat label="New alerts" value={metrics.newDrops} />
            </section>
          </div>
        </header>

        <section className="metricsGrid" aria-label="Drop metrics">
          <MetricCard label="Live products" value={metrics.total} />
          <MetricCard label="New drops" value={metrics.newDrops} tone="danger" />
          <MetricCard label="Keyword hits" value={metrics.hotDrops} tone="gold" />
        </section>

        <section className="dashboardGrid">
          <article className="panel trafficPanel">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Traffic watch</p>
                <h2>Pokemon Center UK</h2>
              </div>
              <img
                src={pokemonCenterLogo}
                className="pokemonCenterLogo"
                alt="Pokemon Center"
              />
            </div>

            <div className={`trafficState ${isHighTraffic ? "high" : "normal"}`}>
              <span className="trafficKicker">
                {status === "loading"
                  ? "Checking"
                  : isHighTraffic
                    ? "Possible drop"
                    : "Normal traffic"}
              </span>
              <p>{trafficData?.stock || "Waiting for the first traffic reading."}</p>
              <div className="trafficMeta">
                <span>Status {trafficData?.httpStatus || "..."}</span>
                <span>{trafficData?.responseTime || "..."}</span>
              </div>
            </div>
          </article>

          <article className="panel quickPanel">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Manual checks</p>
                <h2>Quick shop links</h2>
              </div>
            </div>

            <div className="quickLinks">
              {QUICK_LINKS.map((shop) => (
                <a
                  key={shop.name}
                  href={shop.href}
                  target="_blank"
                  rel="noreferrer"
                  className="quickLink"
                >
                  <span>{shop.name}</span>
                  <strong>Open</strong>
                </a>
              ))}
            </div>
          </article>
        </section>

        <section className="panel feedPanel" id="drops">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Live feed</p>
              <h2>Shop drops</h2>
            </div>
            <span className="countBadge">{metrics.total} tracked</span>
          </div>

          {status === "error" && (
            <div className="emptyState">
              <strong>Feed temporarily unavailable</strong>
              <span>Try refreshing again in a moment.</span>
            </div>
          )}

          {status !== "error" &&
            groupedStores.map(({ store, items }) => (
              <StoreSection
                key={store}
                store={store}
                items={items}
                loading={status === "loading"}
              />
            ))}
        </section>
      </div>
    </main>
  );
}

function SignalStat({ label, value }) {
  return (
    <div>
      <span className="panelLabel">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({ label, value, tone = "default" }) {
  return (
    <article className={`metricCard metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StoreSection({ store, items, loading }) {
  return (
    <section className="storeSection">
      <div className="storeHeader">
        <h3>{store}</h3>
        <span>{items.length} found</span>
      </div>

      {items.length === 0 && (
        <p className="emptyText">
          {loading ? "Checking stock..." : "No tracked drops right now."}
        </p>
      )}

      {items.length > 0 && (
        <div className="dropList">
          {items.map((item, index) => (
            <DropCard item={item} key={`${item.store}-${item.product}-${index}`} />
          ))}
        </div>
      )}
    </section>
  );
}

function DropCard({ item }) {
  const isNew = item.stock?.includes("NEW");
  const isKeyword = item.alert?.includes("KEYWORD");

  return (
    <article className={`dropCard ${isNew ? "newDrop" : ""} ${isKeyword ? "keywordDrop" : ""}`}>
      <div className="dropInfo">
        <span className="store">{item.store || "Store"}</span>
        <h3>{item.product || "Pokemon product"}</h3>
        <div className="badges">
          {isNew && <span className="pill danger">New</span>}
          {isKeyword && <span className="pill gold">Hot keyword</span>}
          {!isNew && !isKeyword && <span className="pill neutral">Seen</span>}
        </div>
      </div>

      {item.link && (
        <a href={item.link} target="_blank" rel="noreferrer" className="viewButton">
          View
        </a>
      )}
    </article>
  );
}

export default App;
