import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createRentalApplication } from "./composition/rental-application-factory.js";
import { createRentalHttpApp } from "./presentation/http/rental-http-app-factory.js";

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST || "127.0.0.1";
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535");
const application = createRentalApplication(process.env.DB_PATH || ".data/rentals.db");
const app = createRentalHttpApp(application);
app.get("/assets/*", serveStatic({ root: "./dist/client" }));
app.get("/", serveStatic({ path: "./dist/client/index.html" }));
const server = serve({ fetch: app.fetch, hostname, port }, () => {
  console.log("機材レンタル管理 API: http://" + hostname + ":" + port);
});
let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  server.close(() => application.close());
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
