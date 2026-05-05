import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("RestockDex API running");
});

app.get("/test", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/stock", (req, res) => {
  res.json([
    {
      product: "Test Booster Box",
      store: "Test Store",
      stock: "Working",
      link: "https://example.com",
    },
  ]);
});

app.get("/pokemon-center-traffic", (req, res) => {
  res.json([
    {
      product: "Pokémon Center Monitor",
      store: "Pokémon Center UK",
      stock: "Normal",
      link: "https://www.pokemoncenter.com/en-gb/category/new-releases",
    },
  ]);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});