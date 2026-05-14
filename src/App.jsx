import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import "./App.css";
import logo from "./assets/restockdex-logo.png";
import pokemonCenterLogo from "./assets/pokemon-center-white.png";

const API_URL =
  import.meta.env.VITE_API_URL || "https://restockdex-production.up.railway.app";

const POKEMON_CENTER_NEW_RELEASES =
  "https://www.pokemoncenter.com/en-gb/category/new-releases";
const NOTIFICATIONS_KEY = "restockdex-notifications";
const NOTIFICATION_PREFS_KEY = "restockdex-notification-prefs";
const LAST_AMBER_NOTIFICATION_KEY = "restockdex-last-amber-notification";
const LAST_RED_NOTIFICATION_KEY = "restockdex-last-red-notification";
const LAST_DROP_NOTIFICATION_KEY = "restockdex-last-drop-notification";
const LAST_NEWS_NOTIFICATION_KEY = "restockdex-last-news-notification";
const SEEN_DROP_NOTIFICATION_LINKS_KEY = "restockdex-seen-drop-notification-links";
const SEEN_NEWS_NOTIFICATION_LINKS_KEY = "restockdex-seen-news-notification-links";
const PUSH_TOKEN_KEY = "restockdex-push-token";
const AMBER_NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1000;
const RED_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

const DEFAULT_NOTIFICATION_PREFS = {
  queueAmber: false,
  queueRed: true,
  drops: true,
  priority: true,
  news: true,
};

function formatDateTime(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadStoredLinkSet(storageKey) {
  try {
    const links = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return new Set(Array.isArray(links) ? links : []);
  } catch {
    return new Set();
  }
}

function saveStoredLinkSet(storageKey, links) {
  localStorage.setItem(storageKey, JSON.stringify([...links].slice(-250)));
}

function daysUntilDate(value) {
  if (!value) return null;

  const today = new Date();
  const releaseDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(releaseDate.getTime())) return null;

  today.setHours(0, 0, 0, 0);
  releaseDate.setHours(0, 0, 0, 0);

  return Math.round((releaseDate - today) / 86400000);
}

const NAV_ITEMS = [
  { id: "monitors", label: "Monitor", icon: "monitor" },
  { id: "drops", label: "Drops", icon: "drops" },
  { id: "links", label: "Links", icon: "links" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "news", label: "News", icon: "news" },
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
    shop: "Titan Cards",
    note: "Readable Pokemon collection feed for live stock and new listings.",
    links: [
      {
        name: "Pokemon collection",
        link: "https://titancards.co.uk/collections/pokemon",
      },
      {
        name: "Booster packs",
        link: "https://titancards.co.uk/search?q=pokemon+booster+pack",
      },
      {
        name: "Elite trainer boxes",
        link: "https://titancards.co.uk/search?q=pokemon+elite+trainer+box",
      },
      {
        name: "Booster boxes",
        link: "https://titancards.co.uk/search?q=pokemon+booster+box",
      },
    ],
  },
  {
    shop: "Japan2UK",
    note: "Japanese and English Pokemon product drop pages.",
    links: [
      {
        name: "Japanese Pokemon",
        link: "https://www.japan2uk.com/pages/japanese-pokemon-products-home",
      },
      {
        name: "English Pokemon",
        link: "https://www.japan2uk.com/pages/english-pokemon-home",
      },
      {
        name: "Japanese booster boxes",
        link: "https://www.japan2uk.com/collections/pokemon-japanese-booster-boxes",
      },
      {
        name: "English ETBs",
        link: "https://www.japan2uk.com/collections/pokemon-english-elite-trainer-boxes",
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
        name: "Newest Pokemon",
        link: "https://www.chaoscards.co.uk/brand/pokemon/sort/release-date-newest-first/cat/booster-boxes-pokemon,booster-packs-pokemon,gift-tins-pokemon,other-pokemon",
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
    name: "TCGplayer Pokemon",
    link: "https://www.tcgplayer.com/content/pokemon/articles",
  },
];

const STORE_ORDER = [
  "The Card Vault",
  "Magic Madhouse",
  "Titan Cards",
  "Japan2UK",
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
  const [releaseItems, setReleaseItems] = useState([]);
  const [releaseSource, setReleaseSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [newsUpdated, setNewsUpdated] = useState(null);
  const [releaseUpdated, setReleaseUpdated] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem(NOTIFICATIONS_KEY) === "enabled";
  });
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      return {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...JSON.parse(localStorage.getItem(NOTIFICATION_PREFS_KEY) || "{}"),
      };
    } catch {
      return DEFAULT_NOTIFICATION_PREFS;
    }
  });
  const [error, setError] = useState("");
  const lastPokemonCenterStatus = useRef(null);
  const seenDropNotificationLinks = useRef(
    loadStoredLinkSet(SEEN_DROP_NOTIFICATION_LINKS_KEY)
  );
  const seenNewsNotificationLinks = useRef(
    loadStoredLinkSet(SEEN_NEWS_NOTIFICATION_LINKS_KEY)
  );
  const dropNotificationsPrimed = useRef(seenDropNotificationLinks.current.size > 0);
  const newsNotificationsPrimed = useRef(seenNewsNotificationLinks.current.size > 0);
  const pushToken = useRef(localStorage.getItem(PUSH_TOKEN_KEY) || "");
  const pushListenersReady = useRef(false);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (notificationsEnabled && Capacitor.isNativePlatform()) {
      setupNativePushNotifications();
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    if (pushToken.current) {
      registerPushToken(pushToken.current, notificationPrefs);
    }
  }, [notificationPrefs]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchAll();
    };

    window.addEventListener("focus", fetchAll);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", fetchAll);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  async function fetchAll() {
    try {
      setRefreshing(true);
      setError("");
      const fetchJson = async (path) => {
        const response = await fetch(`${API_URL}${path}`);
        if (!response.ok) throw new Error(`${path} returned ${response.status}`);
        return response.json();
      };

      const [stock, drops, traffic, status, news, releases] =
        await Promise.allSettled([
          fetchJson("/stock"),
          fetchJson("/drops"),
          fetchJson("/pokemon-center-traffic"),
          fetchJson("/status"),
          fetchJson("/news"),
          fetchJson("/release-calendar"),
        ]);

      if (stock.status === "fulfilled") {
        setLiveData(Array.isArray(stock.value) ? stock.value : []);
      }
      if (drops.status === "fulfilled") {
        setDropData(Array.isArray(drops.value?.items) ? drops.value.items : []);
      }
      if (traffic.status === "fulfilled") {
        setTrafficData(Array.isArray(traffic.value) ? traffic.value[0] : null);
      }
      if (status.status === "fulfilled") {
        setShopStatus(Array.isArray(status.value?.shops) ? status.value.shops : []);
      }
      if (news.status === "fulfilled") {
        setNewsItems(Array.isArray(news.value?.items) ? news.value.items : []);
        setNewsUpdated(
          news.value?.lastUpdated ? new Date(news.value.lastUpdated) : null
        );
      }
      if (releases.status === "fulfilled") {
        setReleaseItems(
          Array.isArray(releases.value?.items) ? releases.value.items : []
        );
        setReleaseSource(releases.value?.sourceUrl || null);
        setReleaseUpdated(
          releases.value?.lastUpdated
            ? new Date(releases.value.lastUpdated)
            : null
        );
      }

      const failedCount = [stock, drops, traffic, status, news, releases].filter(
        (result) => result.status === "rejected"
      ).length;
      setError(
        failedCount > 0
          ? "Some live data could not refresh. Showing the latest available data."
          : ""
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error("RestockDex fetch failed:", err);
      setError("Could not connect to the RestockDex API.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const groupedStores = useMemo(() => {
    return STORE_ORDER.map((store) => ({
      store,
      items: dropData.filter((item) => item.store?.includes(store)),
      status: shopStatus.find((shop) => shop.store === store),
    }));
  }, [dropData, shopStatus]);
  const liveGroupedStores = useMemo(() => {
    return STORE_ORDER.map((store) => ({
      store,
      items: liveData.filter((item) => item.store?.includes(store)),
      status: shopStatus.find((shop) => shop.store === store),
    }));
  }, [liveData, shopStatus]);

  const hotDrops = dropData.filter((item) => item.alert?.includes("KEYWORD"));
  const pokemonCenterStatus = trafficData?.accessStatus || "checking";
  const lastCheckedLabel = formatTime(lastUpdated);
  const trafficBadgeLabel =
    pokemonCenterStatus === "busy"
      ? "Potential queue"
    : pokemonCenterStatus === "blocked"
      ? "Check manually"
      : pokemonCenterStatus === "normal"
      ? "Normal"
      : "Checking";
  const pokemonCenterWatchItems = useMemo(() => {
    return releaseItems
      .map((item) => ({
        ...item,
        daysUntil: daysUntilDate(item.date),
      }))
      .filter((item) => item.daysUntil !== null && item.daysUntil >= 0 && item.daysUntil <= 7)
      .slice(0, 3);
  }, [releaseItems]);
  const latestAlerts = useMemo(() => {
    const alerts = [];

    if (trafficData) {
      if (pokemonCenterStatus === "busy") {
        alerts.push({
          id: "pokemon-center-busy",
          tone: "danger",
          title: "Pokemon Center possible queue",
          detail: pokemonCenterWatchItems.length
            ? "Busy signal detected during a release watch window."
            : "Busy signal detected. Open new releases for a quick manual check.",
          time: trafficData.lastQueueSeenAt || lastUpdated,
        });
      } else if (pokemonCenterStatus === "blocked") {
        alerts.push({
          id: "pokemon-center-check",
          tone: "warning",
          title: "Pokemon Center manual check",
          detail: "Pokemon Center has not loaded clearly for a while. A quick check is sensible.",
          time: lastUpdated,
        });
      }
    }

    dropData
      .slice()
      .sort((a, b) => new Date(b.droppedAt || 0) - new Date(a.droppedAt || 0))
      .slice(0, 5)
      .forEach((item, index) => {
        alerts.push({
          id: `${item.link}-${index}`,
          tone: item.alert?.includes("KEYWORD") ? "hot" : "info",
          title: `${item.store}: new stock captured`,
          detail: item.product,
          time: item.droppedAt,
          link: item.link,
        });
      });

    return alerts.slice(0, 6);
  }, [dropData, lastUpdated, pokemonCenterStatus, pokemonCenterWatchItems.length, trafficData]);

  useEffect(() => {
    const previousStatus = lastPokemonCenterStatus.current;
    lastPokemonCenterStatus.current = pokemonCenterStatus;

    if (
      notificationsEnabled &&
      notificationPrefs.queueRed &&
      pokemonCenterStatus === "busy" &&
      previousStatus &&
      previousStatus !== "busy"
    ) {
      sendNotification({
        storageKey: LAST_RED_NOTIFICATION_KEY,
        title: "Pokemon Center red alert",
        body: "Potential queue signal detected. Check Pokemon Center new releases.",
        cooldownMs: RED_NOTIFICATION_COOLDOWN_MS,
      });
    }

    if (
      notificationsEnabled &&
      notificationPrefs.queueAmber &&
      pokemonCenterStatus === "blocked" &&
      previousStatus &&
      previousStatus !== "blocked"
    ) {
      sendNotification({
        storageKey: LAST_AMBER_NOTIFICATION_KEY,
        title: "Pokemon Center amber check",
        body: "Pokemon Center has not loaded clearly for a while. Check new releases when you have a moment.",
        cooldownMs: AMBER_NOTIFICATION_COOLDOWN_MS,
      });
    }
  }, [
    notificationPrefs.queueAmber,
    notificationPrefs.queueRed,
    notificationsEnabled,
    pokemonCenterStatus,
  ]);

  useEffect(() => {
    if (dropData.length === 0) return;

    if (!dropNotificationsPrimed.current) {
      dropData.forEach((item) => {
        if (item.link) seenDropNotificationLinks.current.add(item.link);
      });
      saveStoredLinkSet(
        SEEN_DROP_NOTIFICATION_LINKS_KEY,
        seenDropNotificationLinks.current
      );
      dropNotificationsPrimed.current = true;
      return;
    }

    if (!notificationsEnabled) return;

    const newDrops = dropData.filter((item) => {
      if (!item.link || seenDropNotificationLinks.current.has(item.link)) return false;
      return item.stock?.includes("NEW") || item.droppedAt;
    });

    if (newDrops.length === 0) return;

    newDrops.forEach((item) => seenDropNotificationLinks.current.add(item.link));
    saveStoredLinkSet(
      SEEN_DROP_NOTIFICATION_LINKS_KEY,
      seenDropNotificationLinks.current
    );

    const priorityDrops = newDrops.filter((item) =>
      item.alert?.includes("KEYWORD")
    );
    const shouldSendPriority = notificationPrefs.priority && priorityDrops.length > 0;
    const shouldSendDrops = notificationPrefs.drops && newDrops.length > 0;

    if (!shouldSendPriority && !shouldSendDrops) return;

    const alertItem = shouldSendPriority ? priorityDrops[0] : newDrops[0];
    sendNotification({
      storageKey: LAST_DROP_NOTIFICATION_KEY,
      title: shouldSendPriority ? "Priority Pokemon stock" : "New Pokemon stock",
      body: `${alertItem.store}: ${alertItem.product}`,
      cooldownMs: 0,
    });
  }, [dropData, notificationPrefs.drops, notificationPrefs.priority, notificationsEnabled]);

  useEffect(() => {
    if (newsItems.length === 0) return;

    if (!newsNotificationsPrimed.current) {
      newsItems.forEach((item) => {
        if (item.link) seenNewsNotificationLinks.current.add(item.link);
      });
      saveStoredLinkSet(
        SEEN_NEWS_NOTIFICATION_LINKS_KEY,
        seenNewsNotificationLinks.current
      );
      newsNotificationsPrimed.current = true;
      return;
    }

    if (!notificationsEnabled || !notificationPrefs.news) return;

    const newNews = newsItems.filter((item) => {
      if (!item.link || seenNewsNotificationLinks.current.has(item.link)) return false;
      return true;
    });

    if (newNews.length === 0) return;

    newNews.forEach((item) => seenNewsNotificationLinks.current.add(item.link));
    saveStoredLinkSet(
      SEEN_NEWS_NOTIFICATION_LINKS_KEY,
      seenNewsNotificationLinks.current
    );

    sendNotification({
      storageKey: LAST_NEWS_NOTIFICATION_KEY,
      title: "New Pokemon news",
      body: `${newNews[0].source}: ${newNews[0].title}`,
      cooldownMs: 0,
    });
  }, [newsItems, notificationPrefs.news, notificationsEnabled]);

  function updateNotificationPref(key) {
    const nextPrefs = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key],
    };

    setNotificationPrefs(nextPrefs);
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(nextPrefs));
  }

  async function registerPushToken(token, prefs = notificationPrefs) {
    try {
      await fetch(`${API_URL}/push/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          platform: Capacitor.getPlatform(),
          preferences: prefs,
        }),
      });
    } catch (err) {
      console.error("Push token registration failed:", err);
    }
  }

  async function setupNativePushNotifications() {
    if (!Capacitor.isNativePlatform() || pushListenersReady.current) return;
    pushListenersReady.current = true;

    await PushNotifications.addListener("registration", async (token) => {
      pushToken.current = token.value;
      localStorage.setItem(PUSH_TOKEN_KEY, token.value);
      await registerPushToken(token.value);
    });

    await PushNotifications.addListener("registrationError", (error) => {
      console.error("Push registration failed:", error);
      setError("Push notifications could not register on this device yet.");
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const link = event.notification.data?.link;
      if (link) window.open(link, "_blank", "noreferrer");
    });

    await PushNotifications.register();
  }

  async function enableNotifications() {
    let webGranted = false;
    let nativeGranted = false;

    if ("Notification" in window) {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      webGranted = permission === "granted";
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const localPermissions = await LocalNotifications.requestPermissions();
        const pushPermissions = await PushNotifications.requestPermissions();
        nativeGranted =
          localPermissions.display === "granted" ||
          pushPermissions.receive === "granted";
      } catch (err) {
        console.error("Native notification permission failed:", err);
      }
    }

    if (webGranted || nativeGranted) {
      localStorage.setItem(NOTIFICATIONS_KEY, "enabled");
      setNotificationsEnabled(true);
      if (Capacitor.isNativePlatform()) await setupNativePushNotifications();
      setError("");
    } else {
      setError("Notifications were not enabled. Check your browser or phone settings.");
    }
  }

  async function sendNotification({ storageKey, title, body, cooldownMs = 0 }) {
    const now = Date.now();
    const lastSent = Number(localStorage.getItem(storageKey) || 0);

    if (cooldownMs && now - lastSent < cooldownMs) return;

    localStorage.setItem(storageKey, String(now));

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/app-icon-192.png",
        badge: "/app-icon-192.png",
      });
    }

    if (Capacitor.isNativePlatform() && !pushToken.current) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(now % 2147483647),
              title,
              body,
              schedule: { at: new Date(Date.now() + 1000) },
            },
          ],
        });
      } catch (err) {
        console.error("Native queue notification failed:", err);
      }
    }
  }

  return (
    <div className="page">
      <div className="app">
        <header className="heroPanel">
          <img src={logo} className="logoImg" alt="RestockDex" />

          <div className="heroText">
            <p>
              Pokemon Center queue alerts, tracked shop stock, release calendar,
              and Pokemon news in one tidy dashboard.
            </p>
          </div>

          <div className="heroStatus">
            <span className={`statusBadge ${pokemonCenterStatus}`}>
              {trafficBadgeLabel}
            </span>
            <span>{lastCheckedLabel ? `Last checked ${lastCheckedLabel}` : "Checking now"}</span>
          </div>

          <div className="heroActions">
            <button
              className="refreshButton"
              disabled={refreshing}
              onClick={fetchAll}
              type="button"
            >
              {refreshing ? "Refreshing..." : "Refresh now"}
            </button>
          </div>
        </header>

        {error && <div className="errorBox">{error}</div>}

        {activePage === "drops" && (
          <DropsPage
            groupedStores={groupedStores}
            liveGroupedStores={liveGroupedStores}
            hotDrops={hotDrops}
            lastUpdated={lastUpdated}
            dropData={dropData}
            liveData={liveData}
            loading={loading}
            notificationPrefs={notificationPrefs}
            notificationsEnabled={notificationsEnabled}
            onEnableNotifications={enableNotifications}
            onToggleNotification={updateNotificationPref}
          />
        )}

        {activePage === "links" && <LinksPage />}

        {activePage === "monitors" && (
          <MonitorsPage
            groupedStores={groupedStores}
            pokemonCenterStatus={pokemonCenterStatus}
            trafficBadgeLabel={trafficBadgeLabel}
            trafficData={trafficData}
            latestAlerts={latestAlerts}
            lastCheckedLabel={lastCheckedLabel}
            notificationPrefs={notificationPrefs}
            notificationsEnabled={notificationsEnabled}
            onEnableNotifications={enableNotifications}
            onToggleNotification={updateNotificationPref}
            watchItems={pokemonCenterWatchItems}
          />
        )}

        {activePage === "calendar" && (
          <ReleaseCalendarPage
            releaseItems={releaseItems}
            releaseSource={releaseSource}
            releaseUpdated={releaseUpdated}
          />
        )}

        {activePage === "news" && (
          <NewsPage
            newsItems={newsItems}
            newsUpdated={newsUpdated}
            notificationPrefs={notificationPrefs}
            notificationsEnabled={notificationsEnabled}
            onEnableNotifications={enableNotifications}
            onToggleNotification={updateNotificationPref}
          />
        )}

        <footer className="siteFooter">
          <button
            className="footerLink"
            type="button"
            onClick={() => setActivePage("privacy")}
          >
            Privacy Policy
          </button>
          <span>RestockDex is not affiliated with Pokemon, Nintendo, or retailers.</span>
        </footer>

        {activePage === "privacy" && <PrivacyPolicyPage />}

        <nav className="bottomTabs" aria-label="RestockDex pages">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={item.id === activePage ? "bottomTab active" : "bottomTab"}
              type="button"
              onClick={() => setActivePage(item.id)}
            >
              <TabIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function TabIcon({ name }) {
  const icons = {
    monitor: (
      <>
        <path d="M4 5h16v10H4z" />
        <path d="M9 19h6" />
        <path d="M12 15v4" />
        <path d="M7 10h3l2-3 2 6 2-3h1" />
      </>
    ),
    drops: (
      <>
        <path d="M6 5h12l2 4v10H4V9z" />
        <path d="M6 9h12" />
        <path d="M9 13h6" />
        <path d="M9 16h4" />
      </>
    ),
    links: (
      <>
        <path d="M9 7H6a4 4 0 0 0 0 8h3" />
        <path d="M15 7h3a4 4 0 0 1 0 8h-3" />
        <path d="M8 12h8" />
      </>
    ),
    calendar: (
      <>
        <path d="M5 6h14v14H5z" />
        <path d="M5 10h14" />
        <path d="M8 4v4" />
        <path d="M16 4v4" />
        <path d="M8 14h2" />
        <path d="M13 14h2" />
        <path d="M8 17h2" />
      </>
    ),
    news: (
      <>
        <path d="M5 5h14v14H5z" />
        <path d="M8 9h8" />
        <path d="M8 12h8" />
        <path d="M8 15h5" />
      </>
    ),
  };

  return (
    <span className="tabIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {icons[name]}
      </svg>
    </span>
  );
}

function DropsPage({
  groupedStores,
  liveGroupedStores,
  hotDrops,
  lastUpdated,
  dropData,
  liveData,
  loading,
  notificationPrefs,
  notificationsEnabled,
  onEnableNotifications,
  onToggleNotification,
}) {
  const activeDropStores = groupedStores.filter(({ items }) => items.length > 0);
  const quietDropStores = groupedStores.filter(({ items }) => items.length === 0);
  const activeLiveStores = liveGroupedStores.filter(({ items }) => items.length > 0);
  const quietLiveStores = liveGroupedStores.filter(({ items }) => items.length === 0);

  return (
    <>
      <section className="statsGrid">
        <StatCard label="Live products" value={liveData.length} />
        <StatCard label="48h drops" value={dropData.length} />
        <StatCard label="Priority hits" value={hotDrops.length} />
      </section>

      <section className="notificationSettings pageNotificationSettings">
        <div>
          <p className="storeKicker">Drop notifications</p>
          <h3>Stock alert settings</h3>
        </div>
        <button
          className="viewButton"
          disabled={notificationsEnabled}
          onClick={onEnableNotifications}
          type="button"
        >
          {notificationsEnabled ? "Notifications on" : "Enable notifications"}
        </button>
        <div className="toggleGrid">
          <NotificationToggle
            checked={notificationPrefs.drops}
            label="Stock drops"
            onClick={() => onToggleNotification("drops")}
          />
          <NotificationToggle
            checked={notificationPrefs.priority}
            label="Priority hits"
            onClick={() => onToggleNotification("priority")}
          />
        </div>
      </section>

      <section className="feedPanel">
        <div className="feedHeader">
          <div>
            <p className="eyebrow">Stock tracker</p>
            <h2>48-hour drop log</h2>
            <p className="sectionIntro">
              Products RestockDex first spotted recently. If this is empty,
              nothing new has been captured in the last 48 hours.
            </p>
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

        {activeDropStores.length === 0 && (
          <p className="emptyText cleanEmpty">
            No new drops captured in the last 48 hours. RestockDex is still checking every 60 seconds.
          </p>
        )}

        <div className="shopGrid">
          {activeDropStores.map(({ store, items, status }) => (
            <StoreSection
              key={store}
              store={store}
              items={items}
              status={status}
              loading={loading}
              mode="drops"
            />
          ))}
        </div>

        <QuietStores
          title="Other shops being checked"
          stores={quietDropStores}
          loading={loading}
          mode="drops"
        />
      </section>

      <section className="feedPanel">
        <div className="feedHeader">
          <div>
            <p className="eyebrow">Live stock</p>
            <h2>Live products currently readable</h2>
            <p className="sectionIntro">
              These are products RestockDex can currently read as available from
              shop pages. They may be older products, not brand-new drops.
            </p>
          </div>
        </div>

        {activeLiveStores.length === 0 && (
          <p className="emptyText cleanEmpty">
            No readable live stock right now. Use the Links page for a quick manual check.
          </p>
        )}

        <div className="shopGrid">
          {activeLiveStores.map(({ store, items, status }) => (
            <StoreSection
              key={store}
              store={store}
              items={items}
              status={status}
              loading={loading}
              mode="live"
            />
          ))}
        </div>

        <QuietStores
          title="Other shops being checked"
          stores={quietLiveStores}
          loading={loading}
          mode="live"
        />
      </section>
    </>
  );
}

function QuietStores({ title, stores, loading, mode }) {
  if (stores.length === 0) return null;

  return (
    <details className="quietStores">
      <summary>
        <span>{title}</span>
        <strong>{stores.length}</strong>
      </summary>
      <div className="shopGrid quietStoreGrid">
        {stores.map(({ store, items, status }) => (
          <StoreSection
            key={store}
            store={store}
            items={items}
            status={status}
            loading={loading}
            mode={mode}
          />
        ))}
      </div>
    </details>
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
  latestAlerts,
  lastCheckedLabel,
  notificationPrefs,
  notificationsEnabled,
  onEnableNotifications,
  onToggleNotification,
  pokemonCenterStatus,
  trafficBadgeLabel,
  trafficData,
  watchItems,
}) {
  const lastQueueSeen = formatDateTime(trafficData?.lastQueueSeenAt);
  const primaryWatchItem = watchItems[0];
  const watchLabel =
    primaryWatchItem?.daysUntil === 0
      ? "Today"
      : primaryWatchItem?.daysUntil === 1
      ? "Tomorrow"
      : primaryWatchItem
      ? `${primaryWatchItem.daysUntil} days`
      : null;

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
              <p className="eyebrow">Queue alerts</p>
          </div>
          <span className={`statusBadge ${pokemonCenterStatus}`}>
            {trafficBadgeLabel}
          </span>
        </div>

        {primaryWatchItem && (
          <div className="watchCard">
            <span className="watchBadge">Watch mode</span>
            <div>
              <h3>{primaryWatchItem.title}</h3>
              <p>
                {watchLabel} on the release calendar. Keep an eye on Pokemon
                Center new releases and queue status.
              </p>
            </div>
            <a
              href={POKEMON_CENTER_NEW_RELEASES}
              target="_blank"
              rel="noreferrer"
              className="viewButton"
            >
              Check Pokemon Center
            </a>
          </div>
        )}

          <div className={`trafficCard ${pokemonCenterStatus}`}>
          <h3>{trafficData?.stock || "Checking access..."}</h3>
          <p>
            {pokemonCenterStatus === "blocked"
              ? "Pokemon Center has not loaded clearly for a while. Tap the link below to check new releases."
              : `Response time: ${trafficData?.responseTime || "Checking"}`}
          </p>
          <div className="statusLegend" aria-label="Pokemon Center status guide">
            <span className="legendChip green"><strong>Green</strong> Normal</span>
            <span className="legendChip amber"><strong>Amber</strong> Check manually</span>
            <span className="legendChip red"><strong>Red</strong> Possible queue</span>
          </div>
          <div className="queueHistory">
            <span>Last queue recorded</span>
            <strong>{lastQueueSeen || "No red queue recorded yet"}</strong>
            {trafficData?.lastQueueReason && (
              <p>Signal: {trafficData.lastQueueReason}</p>
            )}
            {!lastQueueSeen && (
              <p>The monitor is active and will save the next strong queue signal here.</p>
            )}
          </div>
          <div className="trafficActions">
            <span className="refreshNote">
              {lastCheckedLabel
                ? `Last checked ${lastCheckedLabel}. Refreshes every 60 seconds.`
                : "Refreshes automatically every 60 seconds"}
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
          <div className="notificationSettings monitorNotificationSettings">
            <div>
              <p className="storeKicker">Notifications</p>
              <h3>Pokemon Center alerts</h3>
              <p>Choose red queue alerts and quieter amber checks separately.</p>
            </div>
            <button
              className="viewButton"
              disabled={notificationsEnabled}
              onClick={onEnableNotifications}
              type="button"
            >
              {notificationsEnabled ? "Notifications on" : "Enable notifications"}
            </button>
            <div className="toggleGrid">
              <NotificationToggle
                checked={notificationPrefs.queueRed}
                label="Red queue alerts"
                onClick={() => onToggleNotification("queueRed")}
              />
              <NotificationToggle
                checked={notificationPrefs.queueAmber}
                label="Amber checks"
                onClick={() => onToggleNotification("queueAmber")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Live feed</p>
            <h2>Latest alerts</h2>
          </div>
        </div>

        <div className="alertList">
          {latestAlerts.length === 0 ? (
            <p className="emptyText">No alerts right now. RestockDex is checking every 60 seconds.</p>
          ) : (
            latestAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Coverage</p>
            <h2>Shop coverage</h2>
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

function NotificationToggle({ checked, label, onClick }) {
  return (
    <button
      className={checked ? "toggleButton active" : "toggleButton"}
      type="button"
      aria-pressed={checked}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{checked ? "On" : "Off"}</strong>
    </button>
  );
}

function AlertCard({ alert }) {
  const alertTime = formatDateTime(alert.time);

  const content = (
    <>
      <div>
        <p className="storeKicker">{alertTime || "Live monitor"}</p>
        <h3>{alert.title}</h3>
        <p>{alert.detail}</p>
      </div>
      <span className={`alertTone ${alert.tone}`}>
        {alert.tone === "danger"
          ? "Queue"
          : alert.tone === "warning"
          ? "Check"
          : alert.tone === "hot"
          ? "Hot"
          : alert.tone === "success"
          ? "Normal"
          : "Stock"}
      </span>
    </>
  );

  if (alert.link) {
    return (
      <a href={alert.link} target="_blank" rel="noreferrer" className="alertCard">
        {content}
      </a>
    );
  }

  return <article className="alertCard">{content}</article>;
}

function NewsPage({
  newsItems,
  newsUpdated,
  notificationPrefs,
  notificationsEnabled,
  onEnableNotifications,
  onToggleNotification,
}) {
  const [featuredItem, ...otherItems] = newsItems;
  const visibleOtherItems = otherItems.slice(0, 8);
  const hiddenNewsCount = Math.max(0, otherItems.length - visibleOtherItems.length);

  return (
    <>
      <section className="notificationSettings pageNotificationSettings">
        <div>
          <p className="storeKicker">News notifications</p>
          <h3>Pokemon news alerts</h3>
          <p>Notify me when a new headline is picked up.</p>
        </div>
        <button
          className="viewButton"
          disabled={notificationsEnabled}
          onClick={onEnableNotifications}
          type="button"
        >
          {notificationsEnabled ? "Notifications on" : "Enable notifications"}
        </button>
        <div className="toggleGrid">
          <NotificationToggle
            checked={notificationPrefs.news}
            label="News"
            onClick={() => onToggleNotification("news")}
          />
        </div>
      </section>

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
          <>
            <NewsCard item={featuredItem} featured />
            {otherItems.length > 0 && (
              <div className="newsGrid compactNewsGrid">
                {visibleOtherItems.map((item) => (
                  <NewsCard key={item.link} item={item} />
                ))}
              </div>
            )}
            {hiddenNewsCount > 0 && (
              <p className="moreNewsText">
                Showing the newest headlines first. {hiddenNewsCount} more links will appear as the feed refreshes.
              </p>
            )}
          </>
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

function ReleaseCalendarPage({ releaseItems, releaseSource, releaseUpdated }) {
  return (
    <>
      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Release calendar</p>
            <h2>Upcoming Pokemon TCG releases</h2>
          </div>
          <span className="countBadge">
            {releaseUpdated
              ? `Updated ${releaseUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Checking"}
          </span>
        </div>

        {releaseItems.length === 0 ? (
          <p className="emptyText">Checking public release calendar...</p>
        ) : (
          <div className="releaseGrid">
            {releaseItems.map((item) => (
              <ReleaseCard key={`${item.date}-${item.title}`} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Source</p>
            <h2>Calendar source</h2>
          </div>
        </div>

        <div className="quickLinks">
          <a
            href={releaseSource || "https://pokecottage.com/pokemon-set-release-calendar"}
            target="_blank"
            rel="noreferrer"
            className="viewButton"
          >
            View full calendar on PokeCottage
          </a>
        </div>
      </section>
    </>
  );
}

function PrivacyPolicyPage() {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Privacy</p>
          <h2>Privacy Policy</h2>
        </div>
        <span className="countBadge">Effective May 8, 2026</span>
      </div>

      <div className="privacyContent">
        <p>
          RestockDex is a Pokemon stock, queue alert, release calendar, and news
          dashboard. It does not have user accounts and it does not sell personal
          information.
        </p>

        <h3>What the app uses</h3>
        <ul>
          <li>
            The app requests notification permission only if you turn on alerts.
          </li>
          <li>
            Your notification setting and recent alert timing may be stored on
            your device so alerts do not repeat too often.
          </li>
          <li>
            RestockDex connects to the RestockDex API to load shop monitors,
            product drops, release calendar items, and news links.
          </li>
        </ul>

        <h3>Hosting and third parties</h3>
        <p>
          Railway, Vercel, app stores, browsers, and linked retailer or news
          websites may process standard technical data such as IP address,
          device type, browser details, request times, and error logs. Retailer
          and news links open third-party websites with their own privacy
          policies.
        </p>

        <h3>Control</h3>
        <p>
          You can turn notifications off in your browser or phone settings at
          any time. RestockDex is not affiliated with Pokemon, Nintendo, The
          Pokemon Company, or the retailers shown in the app.
        </p>

        <div className="quickLinks">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noreferrer"
            className="viewButton"
          >
            Open public privacy page
          </a>
        </div>
      </div>
    </section>
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
      ? "Automatic checks"
    : statusType === "setup_needed"
      ? "Links only"
      : statusType === "error"
      ? "Manual check"
      : "Checking";
  const changedToOnline =
    status?.accessChanged && status?.status === "online";
  const changedLabel = changedToOnline ? "Checker online" : "Checker changed";

  return (
    <div className={status?.accessChanged ? "monitorCard changed" : "monitorCard"}>
      <div>
        <p className="storeKicker">Shop monitor</p>
        <h3>{store}</h3>
        {status?.accessChanged && (
          <p className={changedToOnline ? "accessChange online" : "accessChange"}>
            {changedLabel}
          </p>
        )}
        {status?.error && (
          <p>
            RestockDex could not read stock from this shop automatically. Use
            Shop Links for a manual check.
          </p>
        )}
      </div>
      <span className={`shopStatus ${statusType === "online" ? "online" : "error"}`}>
        {label}
      </span>
    </div>
  );
}

function StoreSection({ store, items, status, loading, mode = "drops" }) {
  const hasItems = items.length > 0;
  const hasError = status?.status === "error";
  const needsSetup = status?.status === "setup_needed";
  const isDropsMode = mode === "drops";
  const isLiveMode = mode === "live";
  const statusLabel = loading
    ? "Checking"
    : needsSetup
    ? "Links only"
    : hasError
    ? isDropsMode
      ? "Manual stock check"
      : "Manual check"
    : isDropsMode
    ? "Tracking stock"
    : isLiveMode
    ? "Live products"
    : "Automatic checks";
  const emptyMessage = loading
    ? "Checking stock..."
    : needsSetup
    ? "Use the Links page for quick product searches."
    : hasError
    ? "The stock checker could not read this shop. Use the Links page for a manual stock check."
    : isLiveMode
    ? "No live products readable from this shop right now."
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
          {items.length} {isLiveMode ? "live" : "recent"}
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

function NewsCard({ item, featured = false }) {
  const publishedDate = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString([], {
        day: "2-digit",
        month: "short",
      })
    : "";

  return (
    <article className={featured ? "newsCard featuredNewsCard" : "newsCard"}>
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

function ReleaseCard({ item }) {
  const releaseDate = new Date(`${item.date}T00:00:00`).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <article className="newsCard releaseCard">
      <div>
        <p className="storeKicker">{item.source}</p>
        <h3>{item.title}</h3>
      </div>
      <div className="newsFooter">
        <span className="shopCount active">{releaseDate}</span>
        <a href={item.link} target="_blank" rel="noreferrer" className="viewButton">
          Source
        </a>
      </div>
    </article>
  );
}

export default App;
