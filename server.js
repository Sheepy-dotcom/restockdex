import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

const CARD_VAULT_URL =
  "https://thecardvault.co.uk/collections/pokemon-new-releases";

const MAGIC_MADHOUSE_URL =
  "https://magicmadhouse.co.uk/pokemon/pokemon-sets/phantasmal-flames";

let cachedProducts = [];
let lastUpdated = null;

/* 🔍 KEYWORDS */
const KEYWORDS = [
  "booster",
  "booster pack",
  "booster box",
  "etb",
  "elite trainer",
  "tin",
  "collection",
  "charizard",
  "151",
  "prismatic",
  "phantasmal",
  "journey",
  "destined",
];

function matchesKeyword(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.some((k) => lower.includes(k));
}

/* 🧠 SCRAPERS */

async function getCardVault() {
  const res = await fetch(CARD_VAULT_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const products = [];

  $("a").each((_, el) => {
    const text = $(el).text().trim();
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
          store: "Card Vault",
          link,
        });
      }
    }
  });

  return products.slice(0, 20);
}

async function getMagic() {
  const res = await fetch(MAGIC_MADHOUSE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const products = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const link = href.startsWith("http")
      ? href
      : `https://magicmadhouse.co.uk${href}`;

    if (!link.includes("pokemon-me-")) return;

    if (!matchesKeyword(link)) return;

    products.push({
      product: link.split("/").pop(),
      store: "Magic Madhouse",
      link,
    });
  });

  return products.slice(0, 10);
}

/* 🔁 BACKGROUND REFRESH (EVERY 60s) */

async function refreshData() {
  try {
    console.log("🔄 Updating products...");

    const results = await Promise.allSettled([
      getCardVault(),
      getMagic(),
    ]);

    cachedProducts = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    lastUpdated = new Date();

    console.log("✅ Updated:", cachedProducts.length);
  } catch (err) {
    console.log("❌ Update failed:", err.message);
  }
}

/* Run immediately + every minute */
refreshData();
setInterval(refreshData, 60000);

/* 🌐 ROUTES */

app.get("/", (req, res) => {
  res.send("RestockDex API running");
});

app.get("/test", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/stock", (req, res) => {
  res.json({
    updated: lastUpdated,
    count: cachedProducts.length,
    data: cachedProducts,
  });
});

/* 🚀 START */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});