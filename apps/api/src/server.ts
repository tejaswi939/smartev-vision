import { createApp } from "./app.js";
import { env } from "./config.js";

createApp().listen(env.port, "0.0.0.0", () => console.log(`API listening on 0.0.0.0:${env.port}`));
