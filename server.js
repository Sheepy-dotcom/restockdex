import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.json({
    message: "RestockDex API is running",
    routes: ["/test", "/stock", "/pokemon-center-traffic"],
  });
});

app.get("/test", (req, res) => {
  res.json({
    status: "API working ✅",
  });
});

app.get("/stock", (req, res) => {
  res.json([
    {
      product: "Test Booster Box",
      store: "RestockDex Test Store",
      stock: "Working ✅",
      link: "https://www.restockdex.co.uk",
    },
  ]);
});

app.get("/pokemon-center-traffic", async (req, res) => {
  try {
    const response = await fetch(
      "https://www.pokemoncenter.com/en-gb/category/new-releases",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    res.json([
      {
        product: "Pokémon Center Monitor",
        store: "Pokémon Center UK",
        stock: response.status === 200 ? "Normal" : "Possible issue",
        httpStatus: response.status,
        link: "https://www.pokemoncenter.com/en-gb/category/new-releases",
      },
    ]);
  } catch (error) {
    res.json([
      {
        product: "Pokémon Center Error",
        store: "System",
        stock: error.message,
        link: "https://www.pokemoncenter.com/en-gb/category/new-releases",
      },
    ]);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RestockDex API running on port ${PORT}`);
});