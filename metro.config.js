// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// (opcional, pero ayuda a algunos entornos)
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// nativewind exports a named `withNativeWind` function; require(...)
// does not return a callable default. Call the named export instead.
const nativewindMetro = require("nativewind/metro");
module.exports = (nativewindMetro && nativewindMetro.withNativeWind)
  ? nativewindMetro.withNativeWind(config)
  : nativewindMetro(config);
