import { Hono } from "hono";

interface Env {
  // Add your environment variables here
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

export default app;
