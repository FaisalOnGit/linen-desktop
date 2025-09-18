const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// lokasi file config (di folder userData agar aman)
const configPath = path.join(app.getPath("userData"), "config.json");

// load config
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(data);
    } else {
      // jika belum ada, buat default
      const defaultConfig = { ip: "", port: 0 };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
  } catch (err) {
    console.error("Error loading config:", err);
    return { ip: "", port: 0 };
  }
}

// simpan config
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Error saving config:", err);
  }
}

module.exports = { loadConfig, saveConfig };
