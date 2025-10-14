module.exports = function (api) {
  api.cache(true);
  return {
    // nativewind proporciona internamente plugins en su export, así que
    // es más seguro colocarlo en presets para evitar que Babel reciba
    // objetos con `plugins` anidados como si fueran plugins individuales.
    presets: ["babel-preset-expo", "nativewind/babel"],
    plugins: [
      // React Compiler (opcional; lo tienes en deps) — como string para evitar estructuras inválidas
      "babel-plugin-react-compiler",
      // Reanimated SIEMPRE al final
      "react-native-reanimated/plugin",
    ],
  };
};


