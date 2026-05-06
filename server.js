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

const CHAOS_CARDS_URL =
  "https://www.chaoscards.co.uk/shop/card-games/pokemon";

const ARGOS_URL =
  "https://www.argos.co.uk/search/pokemon-cards/";

const SMYTHS_URL =
  "https://www.smythstoys.com/uk/en-gb/brand/pokemon/pokemon-trading-card-game/c/SM0601011202";

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

let cachedShopStatus = [];
let seenLinks = new Set();
let seenLinksPrimed = false;
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

function absoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function cleanProductName(text) {
  return text.replace(/\s+/g, " ").trim();
}

function isChallengePage(html) {
  const lower = html.toLowerCase();
  return (
    lower.includes("pardon our interruption") ||
    lower.includes("captcha") ||
    lower.includes("access denied") ||
    lower.includes("are you a robot")
  );
}

function addUniqueProduct(products, product) {
  if (!product.link || products.some((p) => p.link === product.link)) return;
  products.push(product);
}

async function getCardVaultProducts() {
  const { html } = await fetchWithTimeout(CARD_VAULT_URL);
  const $ = cheerio.load(html);
  const products = [];

  $("li.product-card").each((_, el) => {
    const card = $(el);
    const linkEl = card.find('a[href*="/products/"]').first();
    const text = cleanProductName(linkEl.text());
    const href = linkEl.attr("href");
    const stockText = cleanProductName(card.find(".stock").text()).toLowerCase();
    const isUnavailable =
      card.hasClass("unavailable") ||
      stockText.includes("out of stock") ||
      stockText.includes("sold out");
    const isInStock = /\d+\s+in stock|in stock/.test(stockText);

    if (!text || !href) return;
    if (isUnavailable || !isInStock) return;

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
          availability: stockText,
          link,
        });
      }
    }
  });

  return products.slice(0, 25);
}

async function getMagicMadhouseProducts() {
  const { html } = await fetchWithTimeout(MAGIC_MADHOUSE_URL);
  const products = [];
  const productObjects =
    html.match(/\{\\"id\\":\d+,[\s\S]*?\\"category\\":\[[\s\S]*?\]\}/g) ||
    [];

  productObjects.forEach((productObject) => {
    const productName = cleanProductName(
      productObject.match(/\\"name\\":\\"([^\\"]+)/)?.[1] || ""
    );
    const link = (
      productObject.match(/\\"url\\":\\"([^\\"]+)/)?.[1] || ""
    ).replaceAll("\\/", "/");
    const stockLevel = Number(
      productObject.match(/\\"stock_level\\":(\d+)/)?.[1] || 0
    );

    if (!productName || !link) return;
    if (!link.includes("magicmadhouse.co.uk/pokemon-me-")) return;
    if (stockLevel <= 0) return;
    if (!matchesKeyword(`${productName} ${link}`)) return;

    addUniqueProduct(products, {
      product: productName,
      store: "Magic Madhouse",
      availability: `${stockLevel} in stock`,
      link,
    });
  });

  return products.slice(0, 15);
}

async function getChaosCardsProducts() {
  const { status, html } = await fetchWithTimeout(CHAOS_CARDS_URL);
  if (status !== 200) throw new Error(`Chaos Cards returned ${status}`);

  const $ = cheerio.load(html);
  const products = [];

  $("a").each((_, el) => {
    const productName = cleanProductName($(el).text());
    const href = $(el).attr("href");
    const link = href ? absoluteUrl(href, CHAOS_CARDS_URL) : null;

    if (!productName || !link) return;
    if (!link.includes("chaoscards.co.uk")) return;
    if (!link.includes("/products/")) return;
    if (!productName.toLowerCase().includes("pokemon")) return;
    if (!matchesKeyword(`${productName} ${link}`)) return;

    addUniqueProduct(products, {
      product: productName,
      store: "Chaos Cards",
      link,
    });
  });

  return products.slice(0, 20);
}

async function getArgosProducts() {
  const { status, html } = await fetchWithTimeout(ARGOS_URL);
  if (status !== 200) throw new Error(`Argos returned ${status}`);

  const $ = cheerio.load(html);
  const products = [];
  const availabilityById = new Map();
  const productPattern =
    /\\"productId\\":\\"(\d+)\\"[\s\S]*?\\"deliverable\\":(true|false)[\s\S]*?\\"reservable\\":(true|false)[\s\S]*?\\"buyable\\":(true|false)/g;

  for (const match of html.matchAll(productPattern)) {
    availabilityById.set(match[1], {
      deliverable: match[2] === "true",
      reservable: match[3] === "true",
      buyable: match[4] === "true",
    });
  }

  $("a").each((_, el) => {
    const productName = cleanProductName($(el).text());
    const href = $(el).attr("href");
    const link = href ? absoluteUrl(href, ARGOS_URL) : null;
    const productId = link?.match(/\/product\/(\d+)/)?.[1];
    const availability = productId ? availabilityById.get(productId) : null;
    const canBuy =
      availability?.buyable &&
      (availability.deliverable || availability.reservable);

    if (!productName || !link) return;
    if (!link.includes("argos.co.uk/product/")) return;
    if (!canBuy) return;
    if (!productName.toLowerCase().includes("pok")) return;
    if (!matchesKeyword(`${productName} ${link}`)) return;

    addUniqueProduct(products, {
      product: productName,
      store: "Argos",
      availability: availability.deliverable
        ? "Available for delivery"
        : "Available to reserve",
      link,
    });
  });

  return products.slice(0, 25);
}

async function getSmythsProducts() {
  const { status, html } = await fetchWithTimeout(SMYTHS_URL);
  if (status !== 200) throw new Error(`Smyths Toys returned ${status}`);
  if (isChallengePage(html)) {
    throw new Error("Smyths Toys anti-bot challenge");
  }

  const $ = cheerio.load(html);
  const products = [];

  $("a").each((_, el) => {
    const productName = cleanProductName($(el).text());
    const href = $(el).attr("href");
    const link = href ? absoluteUrl(href, SMYTHS_URL) : null;

    if (!productName || !link) return;
    if (!link.includes("smythstoys.com")) return;
    if (!link.includes("/p/") && !link.includes("/product/")) return;
    if (!productName.toLowerCase().includes("pok")) return;
    if (!matchesKeyword(`${productName} ${link}`)) return;

    addUniqueProduct(products, {
      product: productName,
      store: "Smyths Toys",
      link,
    });
  });

  return products.slice(0, 20);
}

async function refreshProducts() {
  try {
    console.log("Refreshing product drops...");

    const shopChecks = [
      ["The Card Vault", getCardVaultProducts],
      ["Magic Madhouse", getMagicMadhouseProducts],
      ["Chaos Cards", getChaosCardsProducts],
      ["Argos", getArgosProducts],
      ["Smyths Toys", getSmythsProducts],
    ];

    const results = await Promise.allSettled(
      shopChecks.map(([, checkProducts]) => checkProducts())
    );

    cachedShopStatus = results.map((result, index) => {
      const [store] = shopChecks[index];

      if (result.status === "fulfilled") {
        return {
          store,
          status: "online",
          count: result.value.length,
          error: null,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        store,
        status: "error",
        count: 0,
        error: result.reason?.message || "Shop check failed",
        checkedAt: new Date().toISOString(),
      };
    });

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

    if (!seenLinksPrimed) {
      products.forEach((product) => seenLinks.add(product.link));
      seenLinksPrimed = true;
    }

    cachedProducts = products.map((product) => {
      const isNew = !seenLinks.has(product.link);
      const keywordMatch = matchesKeyword(product.product);

      seenLinks.add(product.link);

      return {
        ...product,
        stock: isNew ? "NEW PRODUCT DROP 🚨" : product.availability || "In stock",
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
      status !== 200 ||
      responseTime > 6000 ||
      detectedSignals.length >= 2;

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

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    lastUpdated,
  });
});

app.get("/status", (req, res) => {
  res.json({
    lastUpdated,
    shops: cachedShopStatus,
    traffic: cachedTraffic[0],
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
