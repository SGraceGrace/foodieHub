export const CUISINE_EMOJI: Record<string, string> = {
  // Indian regional & styles
  Indian: '🍛',       'North Indian': '🍛',   'South Indian': '🫓',
  Punjabi: '🫓',      Mughlai: '🍖',          Rajasthani: '🌵',
  Bengali: '🐟',      Andhra: '🌶️',           Biryani: '🍛',
  Chaat: '🥙',        Momos: '🥟',            Kebabs: '🍢',
  Tandoor: '🔥',      Thali: '🍱',

  // Asian cuisines
  Chinese: '🥢',      Japanese: '🍣',          Korean: '🥘',
  Thai: '🍜',         Vietnamese: '🍜',         Tibetan: '🥟',
  Asian: '🥡',        Sushi: '🍣',             'Dim Sum': '🥟',
  Noodles: '🍜',      Ramen: '🍜',

  // Western
  Italian: '🍕',      Pizza: '🍕',             Pasta: '🍝',
  Burgers: '🍔',      American: '🍔',          Continental: '🫕',
  'Fast Food': '🍔',  Mexican: '🌮',           Mediterranean: '🧆',
  Lebanese: '🧆',     Arabian: '🥙',           Turkish: '🥙',
  Greek: '🫙',        Spanish: '🥘',

  // Snacks & street food
  'Street Food': '🌮', Snacks: '🍟',           Sandwiches: '🥪',
  Wraps: '🌯',         Rolls: '🌯',

  // Healthy & diet
  Healthy: '🥗',       Salads: '🥗',           Vegan: '🌿',
  Vegetarian: '🥦',

  // Grills & meats
  Grills: '🥩',        Seafood: '🦐',          Steak: '🥩',
  Barbecue: '🍖',      'BBQ': '🍖',

  // Sweet & drinks
  Desserts: '🍨',      Sweets: '🍮',           'Ice Cream': '🍦',
  Cakes: '🎂',         Bakery: '🥐',           Beverages: '🧃',
  Smoothies: '🥤',     Shakes: '🧋',           Coffee: '☕',
  Cafe: '☕',           Breakfast: '🍳',

  default: '🍽️',
};

export const CUISINE_BG: Record<string, string> = {
  // Indian
  Indian: 'linear-gradient(135deg,#fff3cd,#ffe082)',
  'North Indian': 'linear-gradient(135deg,#fff3cd,#ffe082)',
  'South Indian': 'linear-gradient(135deg,#fff8e1,#ffecb3)',
  Punjabi: 'linear-gradient(135deg,#fff3cd,#ffe082)',
  Mughlai: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Rajasthani: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Bengali: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Andhra: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Biryani: 'linear-gradient(135deg,#fff3cd,#ffe082)',
  Chaat: 'linear-gradient(135deg,#fff8e1,#ffecb3)',
  Momos: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Kebabs: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Tandoor: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Thali: 'linear-gradient(135deg,#fff3cd,#ffe082)',

  // Asian
  Chinese: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Japanese: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Korean: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Thai: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Vietnamese: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Tibetan: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Asian: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Sushi: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  'Dim Sum': 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Noodles: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Ramen: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',

  // Western
  Italian: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Pizza: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Pasta: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Burgers: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  American: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Continental: 'linear-gradient(135deg,#f3e5f5,#e1bee7)',
  'Fast Food': 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Mexican: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Mediterranean: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)',
  Lebanese: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)',
  Arabian: 'linear-gradient(135deg,#fff3cd,#ffe082)',
  Turkish: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Greek: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Spanish: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',

  // Snacks & street food
  'Street Food': 'linear-gradient(135deg,#fff8e1,#ffecb3)',
  Snacks: 'linear-gradient(135deg,#fff8e1,#ffecb3)',
  Sandwiches: 'linear-gradient(135deg,#f3e5f5,#e1bee7)',
  Wraps: 'linear-gradient(135deg,#f3e5f5,#e1bee7)',
  Rolls: 'linear-gradient(135deg,#f3e5f5,#e1bee7)',

  // Healthy
  Healthy: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Salads: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Vegan: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Vegetarian: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',

  // Grills & meats
  Grills: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Seafood: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)',
  Steak: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Barbecue: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  BBQ: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',

  // Sweet & drinks
  Desserts: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Sweets: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  'Ice Cream': 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Cakes: 'linear-gradient(135deg,#efebe9,#d7ccc8)',
  Bakery: 'linear-gradient(135deg,#efebe9,#d7ccc8)',
  Beverages: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)',
  Smoothies: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Shakes: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)',
  Coffee: 'linear-gradient(135deg,#efebe9,#d7ccc8)',
  Cafe: 'linear-gradient(135deg,#efebe9,#d7ccc8)',
  Breakfast: 'linear-gradient(135deg,#fff8e1,#ffecb3)',

  default: 'linear-gradient(135deg,#f5f5f5,#eeeeee)',
};

// Fallback pool — used for any cuisine not in the map above.
// Picked deterministically by hashing the cuisine name so the same
// cuisine always gets the same emoji (stable across renders).
const FALLBACK_EMOJIS = [
  '🍲','🥘','🫕','🍱','🍢','🥟','🍝','🍖','🌶️','🥚',
  '🧆','🫙','🍤','🥩','🧀','🌽','🍠','🥜','🫔','🥫',
];

const FALLBACK_BGS = [
  'linear-gradient(135deg,#fff3cd,#ffe082)',
  'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  'linear-gradient(135deg,#f3e5f5,#e1bee7)',
  'linear-gradient(135deg,#e0f7fa,#b2ebf2)',
  'linear-gradient(135deg,#efebe9,#d7ccc8)',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getCuisineEmoji(cuisine: string | undefined): string {
  const key = cuisine ?? '';
  if (!key) return CUISINE_EMOJI['default'];
  return CUISINE_EMOJI[key] ?? FALLBACK_EMOJIS[hashString(key) % FALLBACK_EMOJIS.length];
}

export function getCuisineBg(cuisine: string | undefined): string {
  const key = cuisine ?? '';
  if (!key) return CUISINE_BG['default'];
  return CUISINE_BG[key] ?? FALLBACK_BGS[hashString(key) % FALLBACK_BGS.length];
}
