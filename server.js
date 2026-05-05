import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());

const PORT = 3000;

const SUPABASE_URL = "https://sgwecoojuxsqctxlaqfh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnd2Vjb29qdXhzcWN0eGxhcWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODM5NTQsImV4cCI6MjA5MzQ1OTk1NH0.ToWRVgoywSHk6RBSjXSqy-ruPIH27keyzM-Ddajxiu4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CARD_VAULT_URL =
  "https://thecardvault.co.uk/collections/pokemon-new-releases";

const MAGIC_MADHOUSE_URL =
  "https://magicmadhouse.co.uk/pokemon/pokemon-sets/phantasmal-flames";

const POKEMON_CENTER_URL =
  "https://www.pokemoncenter.com/en-gb/category/new-releases";

function isWantedProduct(text) {
  const keywords = [
    "booster pack",
    "booster packs",
    "booster bundle",
    "booster box",
    "bundle",
    "etb",
    "elite trainer box",
    "tin",
    "tins",
    "poster collection",
    "collection",
    "pokemon center",
    "ascended hero",
    "ascended heroes",
  ];

  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function getCardVaultProducts() {
  const response = await fetchWithTimeout(CARD_VAULT_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  const products = [];

  $("a").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const href = $(el).attr("href");

    if (
      text &&
      href &&
      href.includes("/products/") &&
      text.toLowerCase().includes("pokemon") &&
      isWantedProduct(text)
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

  return products.slice(0, 30);
}

async function getMagicMadhouseProducts() {
  const response = await fetchWithTimeout(MAGIC_MADHOUSE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  const html = await response.text();
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

    if (!isWantedProduct(`${productName} ${link}`)) return;

    if (!products.some((p) => p.link === link)) {
      products.push({
        product: productName,
        store: "Magic Madhouse",
        link,
      });
    }
  });

  return products.slice(0, 30);
}

async function getAllProducts() {
  const results = await Promise.allSettled([
    getCardVaultProducts(),
    getMagicMadhouseProducts(),
  ]);

  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
}

app.get("/", (req, res) => {
  res.json({
    message: "RestockDex API is running",
    routes: ["/test", "/stock", "/pokemon-center-traffic"],
  });
});

app.get("/test", (req, res) => {
  res.json({
    status: "API working",
  });
});

app.get("/stock", async (req, res) => {
  try {
    const products = await getAllProducts();

    const { data: existing, error } = await supabase
      .from("products")
      .select("link");

    if (error) {
      return res.json([
        {
          product: "Supabase error",
          store: "System",
          stock: error.message,
          link: "",
        },
      ]);
    }

    const existingLinks = (existing || []).map((p) => p.link);

    const results = [];

    for (const product of products) {
      const isNew = !existingLinks.includes(product.link);

      if (isNew) {
        await supabase.from("products").insert([{ link: product.link }]);
      }

      results.push({
        ...product,
        stock: isNew ? "NEW DROP 🚨" : "Already seen",
      });
    }

    res.json(results);
  } catch (error) {
    res.json([
      {
        product: "Server error",
        store: "System",
        stock: error.message,
        link: "",
      },
    ]);
  }
});

app.get("/pokemon-center-traffic", async (req, res) => {
  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(
      POKEMON_CENTER_URL,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      },
      8000
    );

    const html = await response.text();
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

    if (
      response.status !== 200 ||
      responseTime > 4000 ||
      detectedSignals.length > 0
    ) {
      status = "POSSIBLE DROP / HIGH TRAFFIC 🚨";
    }

    res.json([
      {
        product: "Pokémon Center Monitor",
        store: "Pokémon Center UK",
        stock: status,
        httpStatus: response.status,
        responseTime: `${responseTime}ms`,
        detectedSignals,
        link: POKEMON_CENTER_URL,
      },
    ]);
  } catch (error) {
    res.json([
      {
        product: "Pokémon Center Error",
        store: "System",
        stock: error.message,
        link: POKEMON_CENTER_URL,
      },
    ]);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RestockDex API running on port ${PORT}`);
});