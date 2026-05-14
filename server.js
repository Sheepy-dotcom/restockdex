import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import admin from "firebase-admin";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8080;
const QUEUE_HISTORY_FILE =
  process.env.QUEUE_HISTORY_FILE ||
  path.join(process.cwd(), "data", "queue-history.json");
const PUSH_TOKENS_FILE =
  process.env.PUSH_TOKENS_FILE ||
  path.join(process.cwd(), "data", "push-tokens.json");

const CARD_VAULT_URL =
  "https://thecardvault.co.uk/collections/pokemon-new-releases";

const MAGIC_MADHOUSE_URL =
  "https://magicmadhouse.co.uk/pokemon/pokemon-sets/phantasmal-flames";

const TITAN_CARDS_URL =
  "https://titancards.co.uk/collections/pokemon";

const TITAN_CARDS_PRODUCTS_URL =
  "https://titancards.co.uk/collections/pokemon/products.json";

const JAPAN2UK_URL =
  "https://www.japan2uk.com/pages/japanese-pokemon-products-home";

const JAPAN2UK_PRODUCT_FEEDS = [
  "https://www.japan2uk.com/collections/pokemon-japanese-booster-boxes/products.json",
  "https://www.japan2uk.com/collections/pokemon-japanese-booster-packs/products.json",
  "https://www.japan2uk.com/collections/pokemon-japanese-decks-sets-magazines/products.json",
  "https://www.japan2uk.com/collections/pokemon-english-booster-boxes/products.json",
  "https://www.japan2uk.com/collections/pokemon-english-booster-packs/products.json",
  "https://www.japan2uk.com/collections/pokemon-english-elite-trainer-boxes/products.json",
  "https://www.japan2uk.com/collections/pokemon-english-collection-boxes/products.json",
  "https://www.japan2uk.com/collections/pokemon-english-tins-blisters/products.json",
];

const CHAOS_CARDS_URL =
  "https://www.chaoscards.co.uk/brand/pokemon/sort/release-date-newest-first/cat/booster-boxes-pokemon,booster-packs-pokemon,gift-tins-pokemon,other-pokemon";

const ARGOS_URL =
  "https://www.argos.co.uk/search/pokemon-cards/";

const VERY_URL =
  "https://www.very.co.uk/search/pokemon%20cards";

const AMAZON_URL =
  "https://www.amazon.co.uk/s?k=pokemon+trading+card+game&i=toys&tag=restockdex-21";

const SMYTHS_URL =
  "https://www.smythstoys.com/uk/en-gb/brand/pokemon/pokemon-trading-card-game/c/SM0601011202";

const POKEMON_CENTER_URL =
  "https://www.pokemoncenter.com/en-gb/category/new-releases";

const POKECOTTAGE_RELEASE_CALENDAR_URL =
  "https://pokecottage.com/pokemon-set-release-calendar";

const NEWS_FEEDS = [
  {
    source: "Official Pokemon News",
    url: "https://play.pokemon.com/en-gb/news/",
    type: "play_pokemon",
  },
  {
    source: "TCGplayer Pokemon",
    url: "https://infinite-api.tcgplayer.com/c/articles/",
    type: "tcgplayer_api",
  },
  {
    source: "Game Rant",
    url: "https://gamerant.com/feed/",
    filterKeywords: ["pokemon", "pokémon"],
    headers: {
      "User-Agent": "curl/8.7.1",
      Accept: "*/*",
      Connection: "close",
    },
  },
  {
    source: "PokeGuardian",
    url: "https://www.pokeguardian.com/sitemap.xml",
    type: "sitemap",
    limit: 8,
  },
];

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
    accessStatus: "checking",
    httpStatus: "Checking",
    responseTime: "Checking",
    detectedSignals: [],
    lastQueueSeenAt: null,
    lastQueueReason: null,
    link: POKEMON_CENTER_URL,
  },
];

let cachedShopStatus = [];
let cachedNews = [];
let cachedDrops = [];
let cachedReleaseCalendar = [];
let previousShopStatus = new Map();
let seenLinks = new Set();
let seenLinksPrimed = false;
let lastUpdated = null;
let newsLastUpdated = null;
let releaseCalendarLastUpdated = null;
let lastPokemonCenterQueue = null;
let lastPokemonCenterAccessStatus = "checking";
let pokemonCenterUnclearChecks = 0;
let pokemonCenterAmberScore = 0;
let queueHistory = [];
let pushTokens = new Map();
let previousNewsLinks = new Set();
let newsLinksPrimed = false;
let firebaseReady = false;
const DROP_HISTORY_MS = 48 * 60 * 60 * 1000;
const QUEUE_HISTORY_LIMIT = 50;
const POKEMON_CENTER_UNCLEAR_LIMIT = 20;
const POKEMON_CENTER_AMBER_SCORE_LIMIT = 30;

function setupNeeded(message) {
  const error = new Error(message);
  error.code = "SETUP_NEEDED";
  return error;
}

function matchesKeyword(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.some((keyword) => lower.includes(keyword));
}

async function fetchWithTimeout(url, timeout = 8000, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
        ...headers,
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

function cleanNewsText(text) {
  return cleanProductName(
    text
      .replace(/<!\[CDATA\[/g, "")
      .replace(/\]\]>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  );
}

function titleFromUrl(url) {
  const slug = url.split("/").pop() || "";
  return cleanNewsText(
    slug
      .replace(/^\d+_/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function tcgplayerArticleUrl(canonicalUrl) {
  if (!canonicalUrl) return "";
  if (canonicalUrl.startsWith("http")) return canonicalUrl;

  return `https://www.tcgplayer.com/content${canonicalUrl.startsWith("/") ? "" : "/"}${canonicalUrl}`;
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

function pruneRecentDrops(drops) {
  const cutoff = Date.now() - DROP_HISTORY_MS;
  return drops.filter((drop) => new Date(drop.droppedAt).getTime() >= cutoff);
}

async function loadQueueHistory() {
  try {
    const data = JSON.parse(await readFile(QUEUE_HISTORY_FILE, "utf8"));
    queueHistory = Array.isArray(data.events) ? data.events : [];
    lastPokemonCenterQueue = queueHistory[0] || null;
    console.log(`Loaded ${queueHistory.length} Pokemon Center queue events`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Queue history load failed:", error.message);
    }
  }
}

async function saveQueueHistory() {
  try {
    await mkdir(path.dirname(QUEUE_HISTORY_FILE), { recursive: true });
    await writeFile(
      QUEUE_HISTORY_FILE,
      JSON.stringify({ events: queueHistory }, null, 2)
    );
  } catch (error) {
    console.error("Queue history save failed:", error.message);
  }
}

function getFirebaseServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawJson) return null;

  try {
    const account = JSON.parse(rawJson);
    if (account.private_key) {
      account.private_key = account.private_key.replace(/\\n/g, "\n");
    }
    return account;
  } catch (error) {
    console.error("Firebase service account JSON is invalid:", error.message);
    return null;
  }
}

function setupFirebaseMessaging() {
  const account = getFirebaseServiceAccount();
  if (!account) {
    console.log("Firebase push notifications not configured yet");
    return;
  }

  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(account),
      });
    }
    firebaseReady = true;
    console.log("Firebase push notifications ready");
  } catch (error) {
    firebaseReady = false;
    console.error("Firebase setup failed:", error.message);
  }
}

async function loadPushTokens() {
  try {
    const data = JSON.parse(await readFile(PUSH_TOKENS_FILE, "utf8"));
    const tokens = Array.isArray(data.tokens) ? data.tokens : [];
    pushTokens = new Map(tokens.map((token) => [token.token, token]));
    console.log(`Loaded ${pushTokens.size} push notification tokens`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Push token load failed:", error.message);
    }
  }
}

async function savePushTokens() {
  try {
    await mkdir(path.dirname(PUSH_TOKENS_FILE), { recursive: true });
    await writeFile(
      PUSH_TOKENS_FILE,
      JSON.stringify({ tokens: [...pushTokens.values()] }, null, 2)
    );
  } catch (error) {
    console.error("Push token save failed:", error.message);
  }
}

function wantsPush(tokenRecord, preference) {
  return tokenRecord.preferences?.[preference] !== false;
}

async function sendPushNotification({ preference, title, body, data = {} }) {
  if (!firebaseReady || pushTokens.size === 0) return;

  const tokens = [...pushTokens.values()]
    .filter((tokenRecord) => wantsPush(tokenRecord, preference))
    .map((tokenRecord) => tokenRecord.token);

  if (tokens.length === 0) return;

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value ?? "")])
      ),
    });

    response.responses.forEach((result, index) => {
      if (result.success) return;

      const code = result.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      ) {
        pushTokens.delete(tokens[index]);
      }
    });

    if (response.failureCount > 0) await savePushTokens();
    console.log(
      `Push sent: ${response.successCount} ok, ${response.failureCount} failed`
    );
  } catch (error) {
    console.error("Push send failed:", error.message);
  }
}

async function recordPokemonCenterQueue(event) {
  const alreadyLatest = queueHistory[0]?.seenAt === event.seenAt;
  if (alreadyLatest) return;

  queueHistory = [event, ...queueHistory].slice(0, QUEUE_HISTORY_LIMIT);
  lastPokemonCenterQueue = queueHistory[0];
  await saveQueueHistory();
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

async function getTitanCardsProducts() {
  const { status, html } = await fetchWithTimeout(TITAN_CARDS_PRODUCTS_URL, 8000, {
    Accept: "application/json",
  });
  if (status !== 200) throw new Error(`Titan Cards returned ${status}`);

  const data = JSON.parse(html);
  const products = [];

  (data.products || []).forEach((product) => {
    const title = cleanProductName(product.title || "");
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const availableVariants = variants.filter((variant) => variant.available);

    if (!title || availableVariants.length === 0) return;
    if (!title.toLowerCase().includes("pokemon")) return;
    if (!matchesKeyword(`${title} ${(product.tags || []).join(" ")}`)) return;

    const firstAvailable = availableVariants[0];
    const link = `https://titancards.co.uk/products/${product.handle}`;
    const availability = firstAvailable?.price
      ? `In stock - £${firstAvailable.price}`
      : "In stock";

    addUniqueProduct(products, {
      product: title,
      store: "Titan Cards",
      availability,
      link,
    });
  });

  return products.slice(0, 25);
}

async function getJapan2UKProducts() {
  const feedResults = await Promise.all(
    JAPAN2UK_PRODUCT_FEEDS.map((url) =>
      fetchWithTimeout(url, 8000, {
        Accept: "application/json",
      })
    )
  );
  const products = [];

  feedResults.forEach(({ status, html }, index) => {
    if (status !== 200) {
      throw new Error(`Japan2UK feed ${index + 1} returned ${status}`);
    }

    const data = JSON.parse(html);

    (data.products || []).forEach((product) => {
      const title = cleanProductName(product.title || "");
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const availableVariants = variants.filter((variant) => variant.available);

      if (!title || availableVariants.length === 0) return;
      if (!title.toLowerCase().includes("pokemon")) return;
      if (!matchesKeyword(`${title} ${(product.tags || []).join(" ")}`)) return;

      const firstAvailable = availableVariants[0];
      const link = `https://www.japan2uk.com/products/${product.handle}`;
      const price = firstAvailable?.price || firstAvailable?.compare_at_price;
      const availability = price ? `In stock - £${price}` : "In stock";

      addUniqueProduct(products, {
        product: title,
        store: "Japan2UK",
        availability,
        link,
      });
    });
  });

  return products.slice(0, 25);
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

async function getVeryProducts() {
  const { status, html } = await fetchWithTimeout(VERY_URL);
  if (status !== 200) throw new Error(`Very returned ${status}`);
  if (isChallengePage(html)) {
    throw new Error("Very access check blocked");
  }

  const $ = cheerio.load(html);
  const products = [];

  $("a").each((_, el) => {
    const productName = cleanProductName($(el).text());
    const href = $(el).attr("href");
    const link = href ? absoluteUrl(href, VERY_URL) : null;

    if (!productName || !link) return;
    if (!link.includes("very.co.uk")) return;
    if (!productName.toLowerCase().includes("pok")) return;
    if (!matchesKeyword(`${productName} ${link}`)) return;

    addUniqueProduct(products, {
      product: productName,
      store: "Very",
      link,
    });
  });

  return products.slice(0, 20);
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

async function getAmazonProducts() {
  throw setupNeeded(
    "Amazon automatic alerts need official Product Advertising API or Creators API credentials"
  );
}

async function refreshProducts() {
  try {
    console.log("Refreshing product drops...");

    const shopChecks = [
      ["The Card Vault", getCardVaultProducts],
      ["Magic Madhouse", getMagicMadhouseProducts],
      ["Titan Cards", getTitanCardsProducts],
      ["Japan2UK", getJapan2UKProducts],
      ["Chaos Cards", getChaosCardsProducts],
      ["Argos", getArgosProducts],
      ["Very", getVeryProducts],
      ["Amazon UK", getAmazonProducts],
      ["Smyths Toys", getSmythsProducts],
    ];

    const results = await Promise.allSettled(
      shopChecks.map(([, checkProducts]) => checkProducts())
    );

    cachedShopStatus = results.map((result, index) => {
      const [store] = shopChecks[index];
      const previousStatus = previousShopStatus.get(store);
      const checkedAt = new Date().toISOString();

      if (result.status === "fulfilled") {
        const status = "online";
        const shopStatus = {
          store,
          status,
          previousStatus,
          accessChanged: Boolean(previousStatus && previousStatus !== status),
          count: result.value.length,
          error: null,
          checkedAt,
        };
        previousShopStatus.set(store, status);
        return shopStatus;
      }

      const status =
        result.reason?.code === "SETUP_NEEDED" ? "setup_needed" : "error";
      const shopStatus = {
        store,
        status,
        previousStatus,
        accessChanged: Boolean(previousStatus && previousStatus !== status),
        count: 0,
        error: result.reason?.message || "Shop check failed",
        checkedAt,
      };
      previousShopStatus.set(store, status);
      return shopStatus;
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

    const checkedAt = new Date().toISOString();
    const freshDrops = [];

    cachedProducts = products.map((product) => {
      const isNew = !seenLinks.has(product.link);
      const keywordMatch = matchesKeyword(product.product);

      seenLinks.add(product.link);

      const productWithStatus = {
        ...product,
        stock: isNew ? "NEW PRODUCT DROP 🚨" : product.availability || "In stock",
        alert:
          isNew && keywordMatch
            ? "KEYWORD ALERT 🔥"
            : keywordMatch
            ? "Keyword match"
            : false,
      };

      if (isNew) {
        freshDrops.push({
          ...productWithStatus,
          droppedAt: checkedAt,
        });
      }

      return productWithStatus;
    });

    cachedDrops = pruneRecentDrops([
      ...freshDrops,
      ...cachedDrops.filter(
        (drop) => !freshDrops.some((freshDrop) => freshDrop.link === drop.link)
      ),
    ]);

    if (freshDrops.length > 0) {
      const priorityDrop = freshDrops.find((drop) =>
        drop.alert?.includes("KEYWORD")
      );
      const alertDrop = priorityDrop || freshDrops[0];
      await sendPushNotification({
        preference: priorityDrop ? "priority" : "drops",
        title: priorityDrop ? "Priority Pokemon stock" : "New Pokemon stock",
        body: `${alertDrop.store}: ${alertDrop.product}`,
        data: {
          type: "drop",
          link: alertDrop.link,
          store: alertDrop.store,
        },
      });
    }

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

    const hasQueueSignal = detectedSignals.some((signal) =>
      ["queue", "waiting room", "high traffic"].includes(signal)
    );
    const hasAmberSignal = detectedSignals.some((signal) =>
      ["captcha", "access denied", "challenge", "please wait"].includes(signal)
    );
    const isBusy =
      [429, 503].includes(status) ||
      responseTime > 10000 ||
      hasQueueSignal;
    const isUnclear = [401, 403, 406, 408].includes(status) || hasAmberSignal;
    if (isBusy || !isUnclear) {
      pokemonCenterUnclearChecks = 0;
      pokemonCenterAmberScore = 0;
    } else {
      pokemonCenterUnclearChecks += 1;
      pokemonCenterAmberScore = hasAmberSignal
        ? pokemonCenterAmberScore + 2
        : Math.max(0, pokemonCenterAmberScore - 1);
    }
    const showUnclear =
      pokemonCenterUnclearChecks >= POKEMON_CENTER_UNCLEAR_LIMIT &&
      pokemonCenterAmberScore >= POKEMON_CENTER_AMBER_SCORE_LIMIT;
    const accessStatus = isBusy ? "busy" : showUnclear ? "blocked" : "normal";
    const statusText = isBusy
      ? "Potential queue / busy"
      : showUnclear
      ? "Check manually"
      : "Normal";
    const queueReason =
      detectedSignals.length > 0
        ? detectedSignals.join(", ")
        : status !== 200
        ? `site returned ${status}`
        : responseTime > 10000
        ? `slow response ${responseTime}ms`
        : null;

    if (isBusy && lastPokemonCenterAccessStatus !== "busy") {
      await recordPokemonCenterQueue({
        seenAt: new Date().toISOString(),
        reason: queueReason || "busy signal detected",
        httpStatus: status,
        responseTime: `${responseTime}ms`,
        detectedSignals,
        link: POKEMON_CENTER_URL,
      });
      await sendPushNotification({
        preference: "queueRed",
        title: "Pokemon Center red alert",
        body: "Potential queue signal detected. Check Pokemon Center new releases.",
        data: {
          type: "queue-red",
          link: POKEMON_CENTER_URL,
          reason: queueReason || "busy signal detected",
        },
      });
    }

    if (showUnclear && lastPokemonCenterAccessStatus !== "blocked") {
      await sendPushNotification({
        preference: "queueAmber",
        title: "Pokemon Center amber check",
        body: "Pokemon Center has not loaded clearly for a while. Check new releases when you have a moment.",
        data: {
          type: "queue-amber",
          link: POKEMON_CENTER_URL,
          reason: queueReason || "manual check suggested",
        },
      });
    }
    lastPokemonCenterAccessStatus = accessStatus;

    cachedTraffic = [
      {
        product: "Pokémon Center Monitor",
        store: "Pokémon Center UK",
        stock: statusText,
        accessStatus,
        httpStatus: status,
        responseTime: `${responseTime}ms`,
        detectedSignals,
        unclearChecks: pokemonCenterUnclearChecks,
        unclearLimit: POKEMON_CENTER_UNCLEAR_LIMIT,
        amberScore: pokemonCenterAmberScore,
        amberScoreLimit: POKEMON_CENTER_AMBER_SCORE_LIMIT,
        lastQueueSeenAt: lastPokemonCenterQueue?.seenAt || null,
        lastQueueReason: lastPokemonCenterQueue?.reason || null,
        link: POKEMON_CENTER_URL,
      },
    ];

    console.log("Traffic cache updated:", cachedTraffic[0].stock);
  } catch (error) {
    pokemonCenterUnclearChecks += 1;
    pokemonCenterAmberScore = Math.max(0, pokemonCenterAmberScore - 1);
    const showUnclear =
      pokemonCenterUnclearChecks >= POKEMON_CENTER_UNCLEAR_LIMIT &&
      pokemonCenterAmberScore >= POKEMON_CENTER_AMBER_SCORE_LIMIT;
    if (showUnclear && lastPokemonCenterAccessStatus !== "blocked") {
      await sendPushNotification({
        preference: "queueAmber",
        title: "Pokemon Center amber check",
        body: "Pokemon Center has not loaded clearly for a while. Check new releases when you have a moment.",
        data: {
          type: "queue-amber",
          link: POKEMON_CENTER_URL,
          reason: "timeout or blocked",
        },
      });
    }
    lastPokemonCenterAccessStatus = showUnclear ? "blocked" : "normal";
    cachedTraffic = [
      {
        product: "Pokémon Center Monitor",
        store: "Pokémon Center UK",
        stock: showUnclear ? "Check manually" : "Normal",
        accessStatus: showUnclear ? "blocked" : "normal",
        httpStatus: "Error",
        responseTime: "Timeout",
        detectedSignals: ["timeout or blocked"],
        unclearChecks: pokemonCenterUnclearChecks,
        unclearLimit: POKEMON_CENTER_UNCLEAR_LIMIT,
        amberScore: pokemonCenterAmberScore,
        amberScoreLimit: POKEMON_CENTER_AMBER_SCORE_LIMIT,
        lastQueueSeenAt: lastPokemonCenterQueue?.seenAt || null,
        lastQueueReason: lastPokemonCenterQueue?.reason || null,
        link: POKEMON_CENTER_URL,
      },
    ];

    console.error("Traffic refresh failed:", error.message);
  }
}

async function getNewsFeedItems(feed) {
  if (feed.type === "tcgplayer_api") {
    const url = new URL(feed.url);
    url.search = new URLSearchParams({
      source: "infinite-content",
      contentType: "Article",
      verticals: "pokemon",
      rows: "8",
      offset: "0",
    }).toString();

    const { status, html } = await fetchWithTimeout(url.toString(), 8000, {
      Accept: "application/json",
    });
    if (status !== 200) throw new Error(`${feed.source} returned ${status}`);

    const data = JSON.parse(html);
    return (data.result || []).map((item) => ({
      title: cleanNewsText(item.title || ""),
      link: tcgplayerArticleUrl(item.canonicalURL),
      source: feed.source,
      publishedAt: item.dateTime || item.date || "",
      description: cleanNewsText(item.teaser || "Pokemon TCG article from TCGplayer.").slice(0, 180),
    })).filter((item) => item.title && item.link);
  }

  const { status, html } = await fetchWithTimeout(feed.url, 8000, feed.headers);
  if (status !== 200) throw new Error(`${feed.source} returned ${status}`);

  const $ = cheerio.load(html, { xmlMode: true });
  const items = [];

  if (feed.type === "sitemap") {
    $("url loc").each((_, el) => {
      const link = cleanNewsText($(el).text());

      if (!/^https:\/\/www\.pokeguardian\.com\/\d+_/.test(link)) return;

      items.push({
        title: titleFromUrl(link),
        link,
        source: feed.source,
        publishedAt: "",
        description: "Pokemon TCG news from PokeGuardian.",
      });
    });

    return items.slice(0, feed.limit || 8);
  }

  if (feed.type === "play_pokemon") {
    $('[class*="NewsCard"]').each((_, el) => {
      const card = $(el);
      const link = card.find("a[href]").first().attr("href");
      const imageAlt = cleanNewsText(card.find("img[alt]").first().attr("alt") || "");
      const textParts = card
        .find("p")
        .map((__, textEl) => cleanNewsText($(textEl).text()))
        .get()
        .filter(Boolean);
      const publishedAt = textParts[0] || "";
      const title = imageAlt || textParts[1] || "";

      if (!title || !link) return;

      items.push({
        title,
        link: absoluteUrl(link, feed.url) || link,
        source: feed.source,
        publishedAt,
        description: "Official Pokemon news and Play! Pokemon updates.",
      });
    });

    return items.slice(0, 8);
  }

  $("item").each((_, el) => {
    const item = $(el);
    const title = cleanNewsText(item.find("title").first().text());
    const link = cleanNewsText(item.find("link").first().text());
    const publishedAt = cleanNewsText(item.find("pubDate").first().text());
    const description = cleanNewsText(item.find("description").first().text())
      .replace(/<[^>]+>/g, "")
      .slice(0, 180);

    if (!title || !link) return;
    if (
      feed.filterKeywords &&
      !feed.filterKeywords.some((keyword) =>
        `${title} ${description} ${link}`.toLowerCase().includes(keyword)
      )
    ) {
      return;
    }

    items.push({
      title,
      link,
      source: feed.source,
      publishedAt,
      description,
    });
  });

  return items;
}

async function refreshNews() {
  const fifteenMinutes = 15 * 60 * 1000;
  if (
    newsLastUpdated &&
    Date.now() - new Date(newsLastUpdated).getTime() < fifteenMinutes
  ) {
    return;
  }

  try {
    const results = await Promise.allSettled(
      NEWS_FEEDS.map((feed) => getNewsFeedItems(feed))
    );
    const newsItems = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    const uniqueNewsItems = newsItems.filter((item, index, allItems) =>
        allItems.findIndex((existing) => existing.link === item.link) === index
      );
    const sourceCounts = new Map();

    const nextNews = uniqueNewsItems
      .filter((item) => {
        const count = sourceCounts.get(item.source) || 0;
        if (count >= 6) return false;
        sourceCounts.set(item.source, count + 1);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt || 0).getTime() -
          new Date(a.publishedAt || 0).getTime()
      )
      .slice(0, 18);

    const nextNewsLinks = new Set(nextNews.map((item) => item.link).filter(Boolean));
    const newNewsItems = nextNews.filter(
      (item) => item.link && !previousNewsLinks.has(item.link)
    );

    cachedNews = nextNews;
    newsLastUpdated = new Date().toISOString();

    if (!newsLinksPrimed) {
      previousNewsLinks = nextNewsLinks;
      newsLinksPrimed = true;
      return;
    }

    previousNewsLinks = nextNewsLinks;
    if (newNewsItems.length > 0) {
      await sendPushNotification({
        preference: "news",
        title: "New Pokemon news",
        body: `${newNewsItems[0].source}: ${newNewsItems[0].title}`,
        data: {
          type: "news",
          link: newNewsItems[0].link,
          source: newNewsItems[0].source,
        },
      });
    }
  } catch (error) {
    console.error("News refresh failed:", error.message);
  }
}

async function refreshReleaseCalendar() {
  const sixHours = 6 * 60 * 60 * 1000;
  if (
    releaseCalendarLastUpdated &&
    Date.now() - new Date(releaseCalendarLastUpdated).getTime() < sixHours
  ) {
    return;
  }

  try {
    const { status, html } = await fetchWithTimeout(
      POKECOTTAGE_RELEASE_CALENDAR_URL,
      8000
    );
    if (status !== 200) throw new Error(`PokeCottage returned ${status}`);

    const items = [];
    const eventPattern =
      /"(\d{4}-\d{2}-\d{2})":\s*\{[\s\S]*?title:\s*"([^"]+)"[\s\S]*?link:\s*"([^"]*)"/g;

    for (const match of html.matchAll(eventPattern)) {
      const date = match[1];
      const title = cleanNewsText(match[2]);
      const link = match[3] && match[3] !== "#"
        ? absoluteUrl(match[3], POKECOTTAGE_RELEASE_CALENDAR_URL)
        : POKECOTTAGE_RELEASE_CALENDAR_URL;

      if (!title) continue;

      items.push({
        title,
        date,
        link,
        source: "PokeCottage",
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    cachedReleaseCalendar = items
      .filter((item, index, allItems) =>
        allItems.findIndex(
          (existing) => existing.date === item.date && existing.title === item.title
        ) === index
      )
      .filter((item) => item.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 18);
    releaseCalendarLastUpdated = new Date().toISOString();
  } catch (error) {
    console.error("Release calendar refresh failed:", error.message);
  }
}

async function refreshAll() {
  await Promise.allSettled([
    refreshProducts(),
    refreshPokemonCenterTraffic(),
    refreshNews(),
    refreshReleaseCalendar(),
  ]);
}

setupFirebaseMessaging();
await loadQueueHistory();
await loadPushTokens();
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

app.get("/drops", (req, res) => {
  res.json({
    lastUpdated,
    items: cachedDrops,
  });
});

app.get("/pokemon-center-traffic", (req, res) => {
  res.json(cachedTraffic);
});

app.get("/pokemon-center-queue-history", (req, res) => {
  res.json({
    lastQueue: lastPokemonCenterQueue,
    events: queueHistory,
  });
});

app.post("/push/register", async (req, res) => {
  const { token, platform, preferences } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Push token is required" });
  }

  pushTokens.set(token, {
    token,
    platform: platform || "unknown",
    preferences: {
      queueAmber: preferences?.queueAmber !== false,
      queueRed: preferences?.queueRed !== false,
      drops: preferences?.drops !== false,
      priority: preferences?.priority !== false,
      news: preferences?.news !== false,
    },
    updatedAt: new Date().toISOString(),
  });

  await savePushTokens();
  res.json({ ok: true });
});

app.post("/push/unregister", async (req, res) => {
  const { token } = req.body || {};
  if (token) {
    pushTokens.delete(token);
    await savePushTokens();
  }
  res.json({ ok: true });
});

app.get("/push/status", (req, res) => {
  res.json({
    configured: firebaseReady,
    registeredDevices: pushTokens.size,
  });
});

app.get("/news", (req, res) => {
  res.json({
    lastUpdated: newsLastUpdated,
    items: cachedNews,
  });
});

app.get("/release-calendar", (req, res) => {
  res.json({
    source: "PokeCottage",
    sourceUrl: POKECOTTAGE_RELEASE_CALENDAR_URL,
    lastUpdated: releaseCalendarLastUpdated,
    items: cachedReleaseCalendar,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RestockDex API running on port ${PORT}`);
});
