import express from "express";
import cors, { CorsOptions } from "cors";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@shared/types";
import { initCatalog, getResolutionStats, getFreshPreviewUrl } from "./catalog/catalogService";
import { RoomManager } from "./rooms/roomManager";
import { registerSocketHandlers } from "./socket/handlers";

const PORT = Number(process.env.REFRAO_SERVER_PORT || process.env.PORT) || 4010;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function allowedOrigins(): string[] | "*" {
  const raw = process.env.REFRAO_ALLOWED_ORIGINS?.trim();
  if (!raw || raw === "*") return "*";
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

const origins = allowedOrigins();
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || origins === "*" || origins.includes(origin)) return callback(null, true);
    return callback(new Error("Origem não permitida pelo CORS."));
  },
  methods: ["GET", "POST"],
};

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(cors(corsOptions));
app.use(express.json({ limit: "32kb" }));

let catalogReady = false;
let catalogInitError: string | null = null;
let catalogStartedAt = Date.now();

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    ready: catalogReady,
    warmingUp: !catalogReady && !catalogInitError,
    error: catalogInitError,
    uptimeSeconds: Math.round(process.uptime()),
    catalogStartedAt,
    catalog: getResolutionStats(),
  });
});

app.get("/audio/:songId", async (req, res) => {
  const previewUrl = await getFreshPreviewUrl(req.params.songId);
  if (!previewUrl) {
    res.status(404).json({ error: "Preview indisponível para esta música." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, previewUrl);
});

const httpServer = createServer(app);
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

const roomManager = new RoomManager(io);
registerSocketHandlers(io, roomManager, () => catalogReady);

// Render-only deployment: the same Node service can serve the built React app.
const clientDist = path.resolve(__dirname, "../../client/dist");
if (IS_PRODUCTION && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    index: false,
    maxAge: "1h",
    setHeaders(res, filePath) {
      if (/\/assets\/.+\.[a-f0-9]{8,}\./i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));

  app.get(/^\/(?!health(?:\/|$)|audio(?:\/|$)|socket\.io(?:\/|$)).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[refrão] servidor HTTP/WebSocket rodando na porta ${PORT}`);
  console.log(`[refrão] ambiente: ${IS_PRODUCTION ? "produção" : "desenvolvimento"}`);
});

async function warmCatalog() {
  catalogStartedAt = Date.now();
  catalogInitError = null;
  try {
    await initCatalog();
    catalogReady = true;
    console.log("[refrão] catálogo pronto para partidas.");
  } catch (err) {
    catalogReady = false;
    catalogInitError = err instanceof Error ? err.message : "Falha desconhecida ao preparar catálogo.";
    console.error("[refrão] falha ao preparar catálogo:", err);
  }
}

void warmCatalog();

function shutdown(signal: string) {
  console.log(`[refrão] ${signal} recebido; encerrando...`);
  io.close(() => httpServer.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 8_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
