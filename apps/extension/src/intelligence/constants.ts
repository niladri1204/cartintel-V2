// Constants for the Product Intelligence Engine

export const BEAUTY_KEYWORDS = [
  "lipstick", "lip balm", "lip gloss", "lip liner", "lip", "balm", "cream", "serum",
  "shampoo", "gel", "lotion", "perfume", "makeup", "eyeliner", "kajal", "mascara",
  "foundation", "concealer", "blush", "highlighter", "toner", "cleanser", "facewash",
  "face wash", "moisturizer", "sunscreen", "deodorant", "fragrance", "hair oil", "conditioner"
];
export const FASHION_KEYWORDS = ["shirt", "shoe", "dress", "jeans", "t-shirt", "sneaker", "jacket", "pants"];
export const ELECTRONICS_KEYWORDS = ["phone", "laptop", "earbuds", "headphones", "tv", "charger", "camera", "smartphone", "mobile", "iphone", "android", "pixel"];
export const GROCERY_KEYWORDS = ["apple", "milk", "bread", "grocery", "rice", "dal", "coffee", "tea", "sugar"];
export const FURNITURE_KEYWORDS = ["furniture", "sofa", "chair", "table", "bed", "desk", "wardrobe", "bookshelf", "cabinet", "dresser"];
export const BOOKS_KEYWORDS = ["book", "novel", "textbook", "paperback", "hardcover", "edition", "author", "publisher", "isbn"];

export const PACK_REGEX = /pack of (\d+)|(\d+)\s*pack|twin pack/i;
export const QUANTITY_REGEX = /(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(ml|l|g|kg|oz|fl oz|pcs|pieces)\b/i;

export const KNOWN_BRANDS: string[] = [
    "apple", "samsung", "sony", "lg", "dell", "hp", "lenovo", "asus", "acer",
    "oneplus", "xiaomi", "realme", "vivo", "oppo", "boat", "jbl", "bose", "canon",
    "nikon", "logitech", "razer", "sennheiser", "noise", "zebronics", "boult",
    "sandisk", "seagate", "kingston", "intel", "amd", "nvidia", "nintendo",
    "playstation", "xbox", "dyson", "philips", "nike", "adidas", "puma", "levi's",
    "levis", "zara", "h&m", "hm", "gap", "gucci", "prada", "reebok", "woodland",
    "bata", "sparx", "campus", "skechers", "crocs", "roadster", "hrx", "wrogn",
    "biba", "fabindia", "fossil", "titan", "fastrack", "casio", "l'oréal", "loreal",
    "maybelline", "nivea", "dove", "mamaearth", "lakme", "biotique", "plum",
    "minimalist", "garnier", "neutrogena", "cetaphil", "mcaffeine", "wow",
    "tresemme", "pantene", "gillette", "old spice", "axe", "beardo", "vaseline",
    "nykaa", "olay", "nestle", "amul", "britannia", "parle", "tata", "maggi",
    "cadbury", "oreo", "lays", "doritos", "kurkure", "pringles", "pepsi", "sprite",
    "nescafe", "davidoff", "horlicks", "complan", "bournvita", "colgate", "sensodyne", "dabur", "patanjali",
    "fortune", "saffola", "havells", "orient", "crompton", "bajaj", "pigeon",
    "prestige", "wonderchef", "milton", "borosil", "google", "motorola", "nothing",
    "the ordinary", "ordinary", "ikea", "pepperfry"
];
