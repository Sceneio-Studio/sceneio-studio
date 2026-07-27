const fs = require("node:fs");
const path = require("node:path");

const config = `window.SCENEIO_CONFIG = ${JSON.stringify({
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
}, null, 2)};\n`;

fs.writeFileSync(path.join(__dirname, "..", "config.js"), config);
