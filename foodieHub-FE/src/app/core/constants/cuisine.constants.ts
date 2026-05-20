export const CUISINE_EMOJI: Record<string, string> = {
  Indian: '🍛', Biryani: '🍛', Italian: '🍕', Pizza: '🍕',
  Burgers: '🍔', 'Fast Food': '🍔', Japanese: '🍣', Sushi: '🍣',
  Chinese: '🥢', Asian: '🥡', Healthy: '🥗', Salads: '🥗',
  Mexican: '🌮', Snacks: '🍟', Chaat: '🥙', Sandwiches: '🥪',
  Wraps: '🌯', Rolls: '🌯', Beverages: '🧃', Desserts: '🍨',
  Sweets: '🍮', Bakery: '🥐', Cakes: '🎂', default: '🍽️',
};

export const CUISINE_BG: Record<string, string> = {
  Indian: 'linear-gradient(135deg,#fff3cd,#ffe082)',
  Biryani: 'linear-gradient(135deg,#fff3cd,#ffe082)',
  Italian: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Pizza: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Burgers: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  'Fast Food': 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Japanese: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Sushi: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Chinese: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Asian: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Healthy: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Salads: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Snacks: 'linear-gradient(135deg,#fff8e1,#ffecb3)',
  Chaat: 'linear-gradient(135deg,#fff8e1,#ffecb3)',
  Sandwiches: 'linear-gradient(135deg,#f3e5f5,#e1bee7)',
  Wraps: 'linear-gradient(135deg,#f3e5f5,#e1bee7)',
  Rolls: 'linear-gradient(135deg,#f3e5f5,#e1bee7)',
  Beverages: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)',
  Desserts: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Sweets: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Bakery: 'linear-gradient(135deg,#efebe9,#d7ccc8)',
  Cakes: 'linear-gradient(135deg,#efebe9,#d7ccc8)',
  default: 'linear-gradient(135deg,#f5f5f5,#eeeeee)',
};

export function getCuisineEmoji(cuisine: string | undefined): string {
  return CUISINE_EMOJI[cuisine ?? ''] ?? CUISINE_EMOJI['default'];
}

export function getCuisineBg(cuisine: string | undefined): string {
  return CUISINE_BG[cuisine ?? ''] ?? CUISINE_BG['default'];
}
