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
      const defaultConfig = {
        ip: "",
        port: 0,
        powerSettings: {
          1: 15,
          2: 15,
          3: 15,
          4: 15,
        },
        antennaEnabled: {
          1: false,
          2: false,
          3: false,
          4: false,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
  } catch (err) {
    console.error("Error loading config:", err);
    return {
      ip: "",
      port: 0,
      powerSettings: {
        1: 15,
        2: 15,
        3: 15,
        4: 15,
      },
      antennaEnabled: {
        1: false,
        2: false,
        3: false,
        4: false,
      },
    };
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

// save power settings
function savePowerSettings(powerSettings, antennaEnabled) {
  try {
    const currentConfig = loadConfig();
    currentConfig.powerSettings = powerSettings;
    currentConfig.antennaEnabled = antennaEnabled;
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
  } catch (err) {
    console.error("Error saving power settings:", err);
  }
}

// get power settings
function getPowerSettings() {
  try {
    const config = loadConfig();
    return {
      powerSettings: config.powerSettings || { 1: 15, 2: 15, 3: 15, 4: 15 },
      antennaEnabled: config.antennaEnabled || {
        1: false,
        2: false,
        3: false,
        4: false,
      },
    };
  } catch (err) {
    console.error("Error getting power settings:", err);
    return {
      powerSettings: { 1: 15, 2: 15, 3: 15, 4: 15 },
      antennaEnabled: { 1: false, 2: false, 3: false, 4: false },
    };
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  savePowerSettings,
  getPowerSettings,
};
