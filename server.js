import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

const supabase = createClient(
  "https://sgwecoojuxsqctxlaqfh.supabase.co",
  "YOUR_SUPABASE_ANON_KEY_HERE"
);

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

function matchesKeyword(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.some((keyword) => lower.includes(keyword));
}

async function fetchWithTimeout(url, timeout = 7000) {
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

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function getCardVaultProducts() {
  const html = await fetchWithTimeout(CARD_VAULT_URL);
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
  const html = await fetchWithTimeout(MAGIC_MADHOUSE_URL);
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

    const productName = text || link.split("/").pop().replaceAll("-", " ");

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

app.get("/", (req, res) => {
  res.json({
    message: "RestockDex API is running",
    routes: ["/test", "/stock", "/pokemon-center-traffic"],
  });
});

app.get("/test", (req, res) => {
  res.json({ status: "API working" });
});

app.get("/stock", async (req, res) => {
  try {
    const shopResults = await Promise.allSettled([
      getCardVaultProducts(),
      getMagicMadhouseProducts(),
    ]);

    const products = shopResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    if (products.length === 0) {
      return res.json([
        {
          product: "No products detected right now",
          store: "System",
          stock: "Try again shortly",
          alert: false,
          link: "",
        },
      ]);
    }

    const { data: existing, error } = await supabase
      .from("products")
      .select("link");

    if (error) {
      return res.json([
        {
          product: "Supabase error",
          store: "System",
          stock: error.message,
          alert: false,
          link: "",
        },
      ]);
    }

    const existingLinks = (existing || []).map((p) => p.link);
    const results = [];

    for (const product of products) {
      const isNew = !existingLinks.includes(product.link);
      const keywordMatch = matchesKeyword(product.product);

      if (isNew) {
        await supabase.from("products").insert([{ link: product.link }]);
      }

      results.push({
        ...product,
        stock: isNew ? "NEW DROP 🚨" : "Already seen",
        alert:
          isNew && keywordMatch
            ? "KEYWORD ALERT 🔥"
            : keywordMatch
            ? "Keyword match"
            : false,
      });
    }

    res.json(results);
  } catch (error) {
    res.json([
      {
        product: "Server error",
        store: "System",
        stock: error.message,
        alert: false,
        link: "",
      },
    ]);
  }
});

app.get("/pokemon-center-traffic", async (req, res) => {
  const startTime = Date.now();

  try {
    const html = await fetchWithTimeout(POKEMON_CENTER_URL, 5000);
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

    let status = "Normal";

    if (responseTime > 4000 || detectedSignals.length > 0) {
      status = "POSSIBLE DROP / HIGH TRAFFIC 🚨";
    }

    res.json([
      {
        product: "Pokémon Center Monitor",
        store: "Pokémon Center UK",
        stock: status,
        httpStatus: 200,
        responseTime: `${responseTime}ms`,
        detectedSignals,
        link: POKEMON_CENTER_URL,
      },
    ]);
  } catch (error) {
    res.json([
      {
        product: "Pokémon Center Monitor",
        store: "Pokémon Center UK",
        stock: "Possible blocking / timeout",
        httpStatus: "Error",
        responseTime: "Timeout",
        detectedSignals: ["timeout or blocked"],
        link: POKEMON_CENTER_URL,
      },
    ]);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RestockDex API running on port ${PORT}`);
});