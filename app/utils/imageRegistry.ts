// app/utils/imageRegistry.ts
export const PROMO_BADGE = require("../../assets/images/badges/promo/promo.png");

// 1) Registra aquí los assets locales por clave semántica
const PRODUCT_IMAGES: Record<string, any> = {
  // Res / Beef
  "beef-bistec": require("../../assets/images/products/beef-bistec.png"),
  "beef-diezmillo": require("../../assets/images/products/beef-diezmillo.png"),
  "beef-milanesa": require("../../assets/images/products/beef-milanesa.png"),
  "beef-molida": require("../../assets/images/products/beef-molida.png"),
  "beef-chamorrerete": require("../../assets/images/products/beef-chamorrerete.png"),
  "beef-panza": require("../../assets/images/products/beef-panza.png"),
  "beef-costilla": require("../../assets/images/products/beef-costilla.png"),

  // Cerdo / Pork
  "pork-espinazo": require("../../assets/images/products/pork-espinazo.png"),
  "pork-costilla": require("../../assets/images/products/pork-costilla.png"),
  "pork-molida": require("../../assets/images/products/pork-molida.png"),
  "pork-chuleta": require("../../assets/images/products/pork-chuleta.png"),
  "pork-piernita": require("../../assets/images/products/pork-piernita.png"),

  // Pollo / Chicken
  "chicken-pechuga": require("../../assets/images/products/chicken-pechuga.png"),
  "chicken-pierna": require("../../assets/images/products/chicken-pierna.png"),
  "chicken-alita": require("../../assets/images/products/chicken-alita.png"),
  "chicken-milanesa": require("../../assets/images/products/chicken-milanesa.png"),
  "chicken-molida": require("../../assets/images/products/chicken-molida.png"),

  // Embutidos / Sausage
  "sausage-chorizo": require("../../assets/images/products/sausage-chorizo.png"),
  "sausage-longaniza": require("../../assets/images/products/sausage-longaniza.png"),

  // Pescado (opcional)
  "fish-tilapia": require("../../assets/images/products/fish-tilapia.png"),
};

// 2) Fallbacks por categoría (si no hay imageKey ni URL)
const FALLBACK_BY_CATEGORY: Record<string, any> = {
  res: require("../../assets/images/fallbacks/res.png"),
  pollo: require("../../assets/images/fallbacks/pollo.png"),
  cerdo: require("../../assets/images/fallbacks/cerdo.png"),
  pescado: require("../../assets/images/fallbacks/pescado.png"),
  default: require("../../assets/images/fallbacks/default.png"),
};

// 3) Tipo “flexible” que tus pantallas pueden pasar a los helpers
export type ProductLike = {
  imageKey?: string;
  imageUrl?: string;
  imagen?: string;
  img?: string;
  categoria?: string;
  category?: string;
};

// 4) Helper: normaliza categoría a minúsculas
export function getCategory(p: ProductLike): string {
  return String(p?.category ?? p?.categoria ?? "").toLowerCase();
}

// 5) Helper principal: devuelve la fuente de imagen para <Image source={...} />
//    Prioridad: imageKey local → URL remota → fallback por categoría → default
export function getProductImage(p: ProductLike) {
  if (!p) return FALLBACK_BY_CATEGORY.default;

  // a) asset local por clave
  if (p.imageKey && PRODUCT_IMAGES[p.imageKey]) {
    return PRODUCT_IMAGES[p.imageKey];
  }

  // b) URL remota (Firestore)
  const url = (p.imageUrl ?? p.imagen ?? p.img) as string | undefined;
  if (url && typeof url === "string" && url.length) {
    return { uri: url };
  }

  // c) fallback por categoría o default
  const cat = getCategory(p);
  return FALLBACK_BY_CATEGORY[cat] ?? FALLBACK_BY_CATEGORY.default;
}

// 6) (Opcional) Exponer el mapa por si alguna pantalla lo necesita
export const IMAGE_MAP = PRODUCT_IMAGES;
export const CATEGORY_FALLBACKS = FALLBACK_BY_CATEGORY;
