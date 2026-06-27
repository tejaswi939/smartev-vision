import { createApp } from "./app.js";
import { env } from "./config.js";

createApp().listen(env.port, () => console.log(`API listening on :${env.port}`));
