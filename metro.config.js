// expo-sqlite's web backend (wa-sqlite) ships a .wasm file that Metro
// doesn't treat as an asset by default — without this, `expo start --web`
// fails to bundle with "Unable to resolve './wa-sqlite/wa-sqlite.wasm'".
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");

module.exports = config;
