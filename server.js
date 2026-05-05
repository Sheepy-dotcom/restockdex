import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

const CARD_VAULT_URL =
  "https://thecardvault.co.uk/collections/pokemon-new-releases";

const MAGIC_MADHOUSE_URL =
  "https://magicmadhouse.co.uk/pokemon/pokemon-sets/phantasmal-flames";

const POKEMON_CENTER_URL =
  "https://www.pokemoncenter.com/en-gb/category/new-releases";

const KEYWORDS = [
  "booster",
  "booster pack",
  "booster box",
  "booster bundle",
  "bundle",
  "etb",
  "elite trainer",
  "elite trainer box",
  "tin",
  "tins",
  "collection",
  "poster collection",
  "charizard",
  "151",
  "prismatic",
  "surging sparks",
  "destined rivals",
  "journey together",
  "phantasmal flames",
  "ascended heroes",
  "pokemon center",
];

let cachedProducts = [
  {
    product: "Loading live drops...",
    store: "RestockDex",
    stock: "Checking",
    alert: false,
    link: "https://www.restockdex.co.uk",
  },
];

let cachedTraffic = [
  {
    product: "Pokémon Center Monitor",
    store: "Pokémon Center UK",
    stock: "Checking",
    httpStatus: "Checking",
    responseTime: "Checking",
    detectedSignals: [],
    link: POKEMON_CENTER_URL,
  },
];

let seenLinks = new Set();
let lastUpdated = null;

function matchesKeyword(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.some((keyword) => lower.includes(keyword));
}

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
      },
    });

    return {
      status: response.status,
      html: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getCardVaultProducts() {
  const { html } = await fetchWithTimeout(CARD_VAULT_URL);
  const $ = cheerio.load(html);
  const products = [];

  $("a").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const href = $(el).attr("href");

    if (!text || !href) return;

    if (
      href.includes("/products/") &&
      text.toLowerCase().includes("pokemon") &&
      matchesKeyword(text)
    ) {
      const link = href.startsWith("http")
        ? href
        : `https://thecardvault.co.uk${href}`;

      if (!products.some((p) => p.link === link)) {
        products.push({
          product: text,
          store: "The Card Vault",
          link,
        });
      }
    }
  });

  return products.slice(0, 25);
}

async function getMagicMadhouseProducts() {
  const { html } = await fetchWithTimeout(MAGIC_MADHOUSE_URL);
  const $ = cheerio.load(html);
  const products = [];

  $("a").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const href = $(el).attr("href");

    if (!href) return;

    const link = href.startsWith("http")
      ? href
      : `https://magicmadhouse.co.uk${href}`;

    if (!link.includes("magicmadhouse.co.uk/pokemon-me-")) return;

    const productName =
      text || link.split("/").pop().replaceAll("-", " ");

    if (!matchesKeyword(`${productName} ${link}`)) return;

    if (!products.some((p) => p.link === link)) {
      products.push({
        product: productName,
        store: "Magic Madhouse",
        link,
      });
    }
  });

  return products.slice(0, 15);
}

async function refreshProducts() {
  try {
    console.log("Refreshing product drops...");

    const results = await Promise.allSettled([
      getCardVaultProducts(),
      getMagicMadhouseProducts(),
    ]);

    const products = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    if (products.length === 0) {
      cachedProducts = [
        {
          product: "No live products detected right now",
          store: "RestockDex",
          stock: "Try again shortly",
          alert: false,
          link: "https://www.restockdex.co.uk",
        },
      ];
      return;
    }

    cachedProducts = products.map((product) => {
      const isNew = !seenLinks.has(product.link);
      const keywordMatch = matchesKeyword(product.product);

      seenLinks.add(product.link);

      return {
        ...product,
        stock: isNew ? "NEW DROP 🚨" : "Already seen",
        alert:
          isNew && keywordMatch
            ? "KEYWORD ALERT 🔥"
            : keywordMatch
            ? "Keyword match"
            : false,
      };
    });

    lastUpdated = new Date().toISOString();

    console.log(`Product cache updated: ${cachedProducts.length} items`);
  } catch (error) {
    console.error("Product refresh failed:", error.message);
  }
}

async function refreshPokemonCenterTraffic() {
  const startTime = Date.now();

  try {
    const { status, html } = await fetchWithTimeout(POKEMON_CENTER_URL, 5000);
    const responseTime = Date.now() - startTime;
    const lowerHtml = html.toLowerCase();

    const signals = [
      "queue",
      "waiting room",
      "high traffic",
      "captcha",
      "access denied",
      "challenge",
      "too many requests",
      "please wait",
    ];

    const detectedSignals = signals.filter((signal) =>
      lowerHtml.includes(signal)
    );

    const trafficHigh =
      status !== 200 || responseTime > 4000 || detectedSignals.length > 0;

    cachedTraffic = [
      {
        product: "Pokémon Center Monitor",
        store: "Pokémon Center UK",
        stock: trafficHigh ? "POSSIBLE DROP / HIGH TRAFFIC 🚨" : "Normal",
        httpStatus: status,
        responseTime: `${responseTime}ms`,
        detectedSignals,
        link: POKEMON_CENTER_URL,
      },
    ];

    console.log("Traffic cache updated:", cachedTraffic[0].stock);
  } catch (error) {
    cachedTraffic = [
      {
        product: "Pokémon Center Monitor",
        store: "Pokémon Center UK",
        stock: "Possible blocking / timeout",
        httpStatus: "Error",
        responseTime: "Timeout",
        detectedSignals: ["timeout or blocked"],
        link: POKEMON_CENTER_URL,
      },
    ];

    console.error("Traffic refresh failed:", error.message);
  }
}

async function refreshAll() {
  await Promise.allSettled([
    refreshProducts(),
    refreshPokemonCenterTraffic(),
  ]);
}

refreshAll();
setInterval(refreshAll, 60000);

app.get("/", (req, res) => {
  res.send("RestockDex API running");
});

app.get("/test", (req, res) => {
  res.json({
    status: "API working",
    lastUpdated,
  });
});

app.get("/stock", (req, res) => {
  res.json(cachedProducts);
});

app.get("/pokemon-center-traffic", (req, res) => {
  res.json(cachedTraffic);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RestockDex API running on port ${PORT}`);
});