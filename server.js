import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/test", (req, res) => {
  res.json({ status: "API working" });
});

app.get("/stock", (req, res) => {
  res.json([
    {
      product: "Test Booster Box",
      store: "Test Store",
      stock: "Working",
      link: "https://www.restockdex.co.uk",
    },
  ]);
});

app.get("/pokemon-center-traffic", (req, res) => {
  res.json([
    {
      product: "Pokémon Center Monitor",
      store: "Pokémon Center UK",
      stock: "Normal",
      httpStatus: 200,
      link: "https://www.pokemoncenter.com/en-gb/category/new-releases",
    },
  ]);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});