import { useEffect, useMemo, useState } from "react";
import "./App.css";
import logo from "./assets/restockdex-logo.png";
import pokemonCenterLogo from "./assets/pokemon-center-white.png";

const API_URL =
  import.meta.env.VITE_API_URL || "https://restockdex-production.up.railway.app";

const POKEMON_CENTER_NEW_RELEASES =
  "https://www.pokemoncenter.com/en-gb/category/new-releases";

const NAV_ITEMS = [
  { id: "monitors", label: "Monitors" },
  { id: "drops", label: "Drops" },
  { id: "links", label: "Links" },
  { id: "news", label: "News" },
];

const SHOP_LINK_GROUPS = [
  {
    shop: "Pokemon Center",
    note: "Official new releases and product searches.",
    links: [
      {
        name: "New releases",
        link: POKEMON_CENTER_NEW_RELEASES,
      },
      {
        name: "Trading Card Game",
        link: "https://www.pokemoncenter.com/en-gb/search/trading%20card%20game",
      },
      {
        name: "Elite trainer boxes",
        link: "https://www.pokemoncenter.com/en-gb/search/elite%20trainer%20box",
      },
      {
        name: "Booster bundles",
        link: "https://www.pokemoncenter.com/en-gb/search/booster%20bundle",
      },
    ],
  },
  {
    shop: "Amazon UK",
    note: "Popular Pokemon TCG searches on Amazon UK.",
    links: [
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
      {
        name: "Tins",
        link: "https://www.amazon.co.uk/s?k=pokemon+tcg+tin&i=toys&s=date-desc-rank",
      },
    ],
  },
  {
    shop: "The Card Vault",
    note: "Pokemon new releases and major TCG product searches.",
    links: [
      {
        name: "New releases",
        link: "https://thecardvault.co.uk/collections/pokemon-new-releases",
      },
      {
        name: "Booster boxes",
        link: "https://thecardvault.co.uk/search?q=pokemon+booster+box",
      },
      {
        name: "Elite trainer boxes",
        link: "https://thecardvault.co.uk/search?q=pokemon+elite+trainer+box",
      },
      {
        name: "Tins & collections",
        link: "https://thecardvault.co.uk/search?q=pokemon+tin+collection",
      },
    ],
  },
  {
    shop: "Magic Madhouse",
    note: "Pokemon product searches across the Magic Madhouse catalogue.",
    links: [
      {
        name: "Pokemon",
        link: "https://magicmadhouse.co.uk/pokemon",
      },
      {
        name: "Booster boxes",
        link: "https://magicmadhouse.co.uk/search.php?search_query=pokemon%20booster%20box",
      },
      {
        name: "Elite trainer boxes",
        link: "https://magicmadhouse.co.uk/search.php?search_query=pokemon%20elite%20trainer%20box",
      },
      {
        name: "Booster bundles",
        link: "https://magicmadhouse.co.uk/search.php?search_query=pokemon%20booster%20bundle",
      },
    ],
  },
  {
    shop: "Argos",
    note: "High-street stock searches for popular Pokemon card products.",
    links: [
      {
        name: "Pokemon cards",
        link: "https://www.argos.co.uk/search/pokemon-cards/",
      },
      {
        name: "Elite trainer boxes",
        link: "https://www.argos.co.uk/search/pokemon-elite-trainer-box/",
      },
      {
        name: "Booster bundles",
        link: "https://www.argos.co.uk/search/pokemon-booster-bundle/",
      },
      {
        name: "Tins",
        link: "https://www.argos.co.uk/search/pokemon-tin/",
      },
    ],
  },
  {
    shop: "Very",
    note: "Very searches for popular Pokemon card products.",
    links: [
      {
        name: "Pokemon cards",
        link: "https://www.very.co.uk/search/pokemon%20cards",
      },
      {
        name: "Elite trainer boxes",
        link: "https://www.very.co.uk/search/pokemon%20elite%20trainer%20box",
      },
      {
        name: "Booster bundles",
        link: "https://www.very.co.uk/search/pokemon%20booster%20bundle",
      },
      {
        name: "Tins",
        link: "https://www.very.co.uk/search/pokemon%20tin",
      },
    ],
  },
  {
    shop: "Smyths Toys",
    note: "Pokemon TCG searches and Smyths product pages.",
    links: [
      {
        name: "Pokemon TCG",
        link: "https://www.smythstoys.com/uk/en-gb/brand/pokemon/pokemon-trading-card-game/c/SM0601011202",
      },
      {
        name: "Pokemon cards",
        link: "https://www.smythstoys.com/uk/en-gb/search/?text=pokemon%20cards",
      },
      {
        name: "Elite trainer boxes",
        link: "https://www.smythstoys.com/uk/en-gb/search/?text=pokemon%20elite%20trainer%20box",
      },
      {
        name: "Booster bundles",
        link: "https://www.smythstoys.com/uk/en-gb/search/?text=pokemon%20booster%20bundle",
      },
    ],
  },
  {
    shop: "Chaos Cards",
    note: "Pokemon searches for sealed products and collection boxes.",
    links: [
      {
        name: "Pokemon",
        link: "https://www.chaoscards.co.uk/search?type=product&q=pokemon",
      },
      {
        name: "Booster boxes",
        link: "https://www.chaoscards.co.uk/search?type=product&q=pokemon%20booster%20box",
      },
      {
        name: "Elite trainer boxes",
        link: "https://www.chaoscards.co.uk/search?type=product&q=pokemon%20elite%20trainer%20box",
      },
      {
        name: "Collection boxes",
        link: "https://www.chaoscards.co.uk/search?type=product&q=pokemon%20collection%20box",
      },
    ],
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
  "Very",
  "Amazon UK",
  "Chaos Cards",
  "Smyths Toys",
];

function App() {
  const [activePage, setActivePage] = useState("monitors");
  const [liveData, setLiveData] = useState([]);
  const [dropData, setDropData] = useState([]);
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

      const [stockRes, dropsRes, trafficRes, statusRes, newsRes] = await Promise.all([
        fetch(`${API_URL}/stock`),
        fetch(`${API_URL}/drops`),
        fetch(`${API_URL}/pokemon-center-traffic`),
        fetch(`${API_URL}/status`),
        fetch(`${API_URL}/news`),
      ]);

      const stock = await stockRes.json();
      const drops = await dropsRes.json();
      const traffic = await trafficRes.json();
      const status = await statusRes.json();
      const news = await newsRes.json();

      setLiveData(Array.isArray(stock) ? stock : []);
      setDropData(Array.isArray(drops?.items) ? drops.items : []);
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
      items: dropData.filter((item) => item.store?.includes(store)),
      status: shopStatus.find((shop) => shop.store === store),
    }));
  }, [dropData, shopStatus]);

  const hotDrops = dropData.filter((item) => item.alert?.includes("KEYWORD"));
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
              Pokemon Center access checks, shop monitors, product drops, and
              news in one tidy dashboard.
            </p>
          </div>

          <div className="heroActions">
            <button className="refreshButton" onClick={fetchAll} type="button">
              Refresh now
            </button>
          </div>
        </header>

        <nav className="pageMenu" aria-label="RestockDex pages">
          <label htmlFor="page-select">Menu</label>
          <select
            id="page-select"
            value={activePage}
            onChange={(event) => setActivePage(event.target.value)}
          >
            {NAV_ITEMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </nav>

        {error && <div className="errorBox">{error}</div>}

        {activePage === "drops" && (
          <DropsPage
            groupedStores={groupedStores}
            hotDrops={hotDrops}
            lastUpdated={lastUpdated}
            dropData={dropData}
            liveData={liveData}
            loading={loading}
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
  dropData,
  liveData,
  loading,
}) {
  return (
    <>
      <section className="statsGrid">
        <StatCard label="Products tracked" value={liveData.length} />
        <StatCard label="Recent drops" value={dropData.length} />
        <StatCard label="Hot matches" value={hotDrops.length} />
      </section>

      <section className="feedPanel">
        <div className="feedHeader">
          <div>
            <p className="eyebrow">Live feed</p>
            <h2>New product drops by shop</h2>
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
    <section className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Manual checks</p>
          <h2>Shop product links</h2>
        </div>
        <span className="shopStatus error">Links only</span>
      </div>

      <div className="shopLinkGroups">
        {SHOP_LINK_GROUPS.map((group) => (
          <article className="linkGroup" key={group.shop}>
            <div>
              <p className="storeKicker">{group.note}</p>
              <h3>{group.shop}</h3>
            </div>

            <div className="quickLinks">
              {group.links.map((item) => (
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
          </article>
        ))}
      </div>
    </section>
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
    : "No new drops captured in the last 48 hours.";

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
