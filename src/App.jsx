import { useEffect, useMemo, useState } from "react";
import "./App.css";
import logo from "./assets/restockdex-logo.png";
import pokemonCenterLogo from "./assets/pokemon-center-white.png";

const API_URL =
  import.meta.env.VITE_API_URL || "https://restockdex-production.up.railway.app";

const POKEMON_CENTER_NEW_RELEASES =
  "https://www.pokemoncenter.com/en-gb/category/new-releases";

const NAV_ITEMS = [
  { id: "drops", label: "Drops" },
  { id: "links", label: "Links" },
  { id: "monitors", label: "Monitors" },
  { id: "news", label: "News" },
];

const SHOP_LINKS = [
  {
    name: "Pokemon Center",
    link: POKEMON_CENTER_NEW_RELEASES,
  },
  {
    name: "The Card Vault",
    link: "https://thecardvault.co.uk/collections/pokemon-new-releases",
  },
  {
    name: "Magic Madhouse",
    link: "https://magicmadhouse.co.uk/pokemon",
  },
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

const NEWS_LINKS = [
  {
    name: "Official Pokemon news",
    link: "https://www.pokemon.com/us/pokemon-news",
  },
  {
    name: "Game Rant Pokemon",
    link: "https://gamerant.com/pokemon/",
  },
  {
    name: "PokeGuardian",
    link: "https://www.pokeguardian.com/",
  },
  {
    name: "Pokemon Database news",
    link: "https://pokemondb.net/news",
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
  const [activePage, setActivePage] = useState("drops");
  const [liveData, setLiveData] = useState([]);
  const [trafficData, setTrafficData] = useState(null);
  const [shopStatus, setShopStatus] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [newsUpdated, setNewsUpdated] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll() {
    try {
      setError("");

      const [stockRes, trafficRes, statusRes, newsRes] = await Promise.all([
        fetch(`${API_URL}/stock`),
        fetch(`${API_URL}/pokemon-center-traffic`),
        fetch(`${API_URL}/status`),
        fetch(`${API_URL}/news`),
      ]);

      const stock = await stockRes.json();
      const traffic = await trafficRes.json();
      const status = await statusRes.json();
      const news = await newsRes.json();

      setLiveData(Array.isArray(stock) ? stock : []);
      setTrafficData(Array.isArray(traffic) ? traffic[0] : null);
      setShopStatus(Array.isArray(status?.shops) ? status.shops : []);
      setNewsItems(Array.isArray(news?.items) ? news.items : []);
      setNewsUpdated(news?.lastUpdated ? new Date(news.lastUpdated) : null);
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
  const pokemonCenterStatus = trafficData?.accessStatus || "checking";
  const trafficBadgeLabel =
    pokemonCenterStatus === "busy"
      ? "Potential queue"
      : pokemonCenterStatus === "blocked"
      ? "Check manually"
      : pokemonCenterStatus === "normal"
      ? "Normal"
      : "Checking";

  return (
    <div className="page">
      <div className="app">
        <header className="heroPanel">
          <img src={logo} className="logoImg" alt="RestockDex" />

          <div className="heroText">
            <p>
              Pokemon drop tracking, quick links, access monitors, and news in
              one tidy dashboard.
            </p>
          </div>

          <div className="heroActions">
            <button className="refreshButton" onClick={fetchAll} type="button">
              Refresh now
            </button>
          </div>
        </header>

        <nav className="pageTabs" aria-label="RestockDex pages">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? "tabButton active" : "tabButton"}
              onClick={() => setActivePage(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {error && <div className="errorBox">{error}</div>}

        {activePage === "drops" && (
          <DropsPage
            groupedStores={groupedStores}
            hotDrops={hotDrops}
            lastUpdated={lastUpdated}
            liveData={liveData}
            loading={loading}
            newDrops={newDrops}
          />
        )}

        {activePage === "links" && <LinksPage />}

        {activePage === "monitors" && (
          <MonitorsPage
            groupedStores={groupedStores}
            pokemonCenterStatus={pokemonCenterStatus}
            trafficBadgeLabel={trafficBadgeLabel}
            trafficData={trafficData}
          />
        )}

        {activePage === "news" && (
          <NewsPage newsItems={newsItems} newsUpdated={newsUpdated} />
        )}
      </div>
    </div>
  );
}

function DropsPage({
  groupedStores,
  hotDrops,
  lastUpdated,
  liveData,
  loading,
  newDrops,
}) {
  return (
    <>
      <section className="statsGrid">
        <StatCard label="Products tracked" value={liveData.length} />
        <StatCard label="New drops" value={newDrops.length} />
        <StatCard label="Hot matches" value={hotDrops.length} />
      </section>

      <section className="feedPanel">
        <div className="feedHeader">
          <div>
            <p className="eyebrow">Live feed</p>
            <h2>New product drops</h2>
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
    </>
  );
}

function LinksPage() {
  return (
    <>
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
              {shop.name}
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function MonitorsPage({
  groupedStores,
  pokemonCenterStatus,
  trafficBadgeLabel,
  trafficData,
}) {
  return (
    <>
      <section className="panel trafficPanel">
        <div className="trafficHeader">
          <img
            src={pokemonCenterLogo}
            className="pokemonCenterLogo"
            alt="Pokemon Center"
          />
          <div>
            <p className="eyebrow">Access monitor</p>
          </div>
          <span className={`statusBadge ${pokemonCenterStatus}`}>
            {trafficBadgeLabel}
          </span>
        </div>

        <div className={`trafficCard ${pokemonCenterStatus}`}>
          <h3>{trafficData?.stock || "Checking access..."}</h3>
          <p>
            Status: {trafficData?.httpStatus || "Checking"} | Response:{" "}
            {trafficData?.responseTime || "Checking"}
          </p>
          <div className="trafficActions">
            <span className="refreshNote">
              Refreshes automatically every 60 seconds
            </span>
            <a
              href={POKEMON_CENTER_NEW_RELEASES}
              target="_blank"
              rel="noreferrer"
              className="viewButton"
            >
              Pokemon Center new releases
            </a>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Shop health</p>
            <h2>Checker status</h2>
          </div>
        </div>

        <div className="monitorGrid">
          {groupedStores.map(({ store, status }) => (
            <MonitorCard key={store} store={store} status={status} />
          ))}
        </div>
      </section>
    </>
  );
}

function NewsPage({ newsItems, newsUpdated }) {
  return (
    <>
      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Pokemon news</p>
            <h2>Latest headlines</h2>
          </div>
          <span className="countBadge">
            {newsUpdated
              ? `Updated ${newsUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Checking"}
          </span>
        </div>

        {newsItems.length === 0 ? (
          <p className="emptyText">Checking public news feeds...</p>
        ) : (
          <div className="newsGrid">
            {newsItems.map((item) => (
              <NewsCard key={item.link} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">News sources</p>
            <h2>Quick news links</h2>
          </div>
        </div>

        <div className="quickLinks">
          {NEWS_LINKS.map((item) => (
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
    </>
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

function MonitorCard({ store, status }) {
  const statusType = status?.status || "checking";
  const label =
    statusType === "online"
      ? "Online"
      : statusType === "setup_needed"
      ? "API needed"
      : statusType === "error"
      ? "Blocked"
      : "Checking";

  return (
    <div className="monitorCard">
      <div>
        <p className="storeKicker">Shop monitor</p>
        <h3>{store}</h3>
        {status?.error && <p>{status.error}</p>}
      </div>
      <span className={`shopStatus ${statusType === "online" ? "online" : "error"}`}>
        {label}
      </span>
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
    ? "Automatic alerts need official API credentials."
    : hasError
    ? "This shop blocked the automatic check. Use the links page."
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

function NewsCard({ item }) {
  const publishedDate = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString([], {
        day: "2-digit",
        month: "short",
      })
    : "";

  return (
    <article className="newsCard">
      <div>
        <p className="storeKicker">{item.source}</p>
        <h3>{item.title}</h3>
        {item.description && <p>{item.description}</p>}
      </div>
      <div className="newsFooter">
        {publishedDate && <span className="shopCount">{publishedDate}</span>}
        <a href={item.link} target="_blank" rel="noreferrer" className="viewButton">
          Read
        </a>
      </div>
    </article>
  );
}

export default App;
