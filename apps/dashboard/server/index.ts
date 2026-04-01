import express from "express";
import { createServer as createViteServer } from "vite";

const PORT = 5174;

async function start() {
  const app = express();
  app.use(express.json());

  // --- API routes ---
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // --- Vite dev server middleware ---
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
  });
}

start();
