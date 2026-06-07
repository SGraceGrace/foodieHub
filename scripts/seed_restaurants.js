// ─────────────────────────────────────────────────────────────────────────────
// FoodieHub — Seed 20 test restaurants
// Run: mongosh "mongodb://localhost:27017/foodiehub_food" scripts/seed_restaurants.js
// ─────────────────────────────────────────────────────────────────────────────

const restaurants = [
  {
    name: "Spice Garden",
    cuisine: ["Indian", "North Indian"],
    rating: 4.5,
    deliveryTime: 30,
    isOpen: true,
    minOrder: 150,
    priceRange: "₹₹",
    address: "12, Anna Salai, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0550, lng: 80.2720 },
    menu: [
      { category: "Starters", items: [
        { name: "Paneer Tikka",    price: 220, isVeg: true,  available: true },
        { name: "Chicken 65",      price: 280, isVeg: false, available: true },
        { name: "Veg Samosa",      price: 80,  isVeg: true,  available: true }
      ]},
      { category: "Main Course", items: [
        { name: "Butter Chicken",        price: 340, isVeg: false, available: true },
        { name: "Dal Makhani",           price: 220, isVeg: true,  available: true },
        { name: "Paneer Butter Masala",  price: 280, isVeg: true,  available: true }
      ]},
      { category: "Breads", items: [
        { name: "Butter Naan",   price: 40, isVeg: true, available: true },
        { name: "Garlic Naan",   price: 50, isVeg: true, available: true }
      ]}
    ]
  },
  {
    name: "Biryani Mahal",
    cuisine: ["Biryani", "Mughlai"],
    rating: 4.7,
    deliveryTime: 35,
    isOpen: true,
    minOrder: 200,
    priceRange: "₹₹",
    address: "45, T. Nagar, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0418, lng: 80.2341 },
    menu: [
      { category: "Biryani", items: [
        { name: "Chicken Dum Biryani",  price: 320, isVeg: false, available: true },
        { name: "Mutton Biryani",       price: 380, isVeg: false, available: true },
        { name: "Veg Dum Biryani",      price: 240, isVeg: true,  available: true },
        { name: "Egg Biryani",          price: 260, isVeg: false, available: true }
      ]},
      { category: "Sides", items: [
        { name: "Raita",    price: 60,  isVeg: true,  available: true },
        { name: "Salan",    price: 80,  isVeg: true,  available: true }
      ]}
    ]
  },
  {
    name: "Dragon Palace",
    cuisine: ["Chinese", "Asian"],
    rating: 4.2,
    deliveryTime: 25,
    isOpen: true,
    minOrder: 150,
    priceRange: "₹₹",
    address: "78, Nungambakkam, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0605, lng: 80.2502 },
    menu: [
      { category: "Soups", items: [
        { name: "Sweet Corn Soup",  price: 120, isVeg: true,  available: true },
        { name: "Hot & Sour Soup",  price: 130, isVeg: true,  available: true }
      ]},
      { category: "Main Course", items: [
        { name: "Chicken Fried Rice",   price: 220, isVeg: false, available: true },
        { name: "Veg Manchurian",       price: 180, isVeg: true,  available: true },
        { name: "Hakka Noodles",        price: 190, isVeg: true,  available: true },
        { name: "Chilli Chicken",       price: 280, isVeg: false, available: true }
      ]}
    ]
  },
  {
    name: "Pizza Bella",
    cuisine: ["Pizza", "Italian"],
    rating: 4.3,
    deliveryTime: 20,
    isOpen: true,
    minOrder: 200,
    priceRange: "₹₹",
    address: "23, Adyar, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0067, lng: 80.2564 },
    menu: [
      { category: "Pizzas", items: [
        { name: "Margherita",         price: 280, isVeg: true,  available: true },
        { name: "Chicken BBQ",        price: 380, isVeg: false, available: true },
        { name: "Veggie Delight",     price: 320, isVeg: true,  available: true },
        { name: "Pepperoni",          price: 400, isVeg: false, available: true }
      ]},
      { category: "Sides", items: [
        { name: "Garlic Bread",  price: 120, isVeg: true, available: true },
        { name: "Coleslaw",      price: 80,  isVeg: true, available: true }
      ]}
    ]
  },
  {
    name: "Burger Barn",
    cuisine: ["Burgers", "American"],
    rating: 4.1,
    deliveryTime: 20,
    isOpen: true,
    minOrder: 150,
    priceRange: "₹",
    address: "5, OMR, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 12.9279, lng: 80.2284 },
    menu: [
      { category: "Burgers", items: [
        { name: "Classic Chicken Burger",  price: 180, isVeg: false, available: true },
        { name: "Double Patty Burger",     price: 260, isVeg: false, available: true },
        { name: "Veg Crispy Burger",       price: 150, isVeg: true,  available: true }
      ]},
      { category: "Sides & Drinks", items: [
        { name: "French Fries",   price: 100, isVeg: true,  available: true },
        { name: "Onion Rings",    price: 110, isVeg: true,  available: true },
        { name: "Milkshake",      price: 130, isVeg: true,  available: true }
      ]}
    ]
  },
  {
    name: "Sushi Sakura",
    cuisine: ["Japanese", "Sushi"],
    rating: 4.6,
    deliveryTime: 40,
    isOpen: true,
    minOrder: 300,
    priceRange: "₹₹₹",
    address: "34, Boat Club Road, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0359, lng: 80.2551 },
    menu: [
      { category: "Sushi Rolls", items: [
        { name: "California Roll",    price: 380, isVeg: false, available: true },
        { name: "Spicy Tuna Roll",    price: 420, isVeg: false, available: true },
        { name: "Avocado Roll",       price: 320, isVeg: true,  available: true }
      ]},
      { category: "Mains", items: [
        { name: "Chicken Teriyaki",  price: 480, isVeg: false, available: true },
        { name: "Tempura Udon",      price: 380, isVeg: false, available: true }
      ]}
    ]
  },
  {
    name: "South Indian Kitchen",
    cuisine: ["South Indian"],
    rating: 4.4,
    deliveryTime: 25,
    isOpen: true,
    minOrder: 100,
    priceRange: "₹",
    address: "8, Mylapore, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0336, lng: 80.2692 },
    menu: [
      { category: "Tiffin", items: [
        { name: "Masala Dosa",     price: 80,  isVeg: true, available: true },
        { name: "Idli (3 pcs)",    price: 60,  isVeg: true, available: true },
        { name: "Medu Vada",       price: 70,  isVeg: true, available: true },
        { name: "Pongal",          price: 80,  isVeg: true, available: true }
      ]},
      { category: "Rice", items: [
        { name: "Curd Rice",       price: 90,  isVeg: true, available: true },
        { name: "Sambar Rice",     price: 100, isVeg: true, available: true },
        { name: "Lemon Rice",      price: 90,  isVeg: true, available: true }
      ]}
    ]
  },
  {
    name: "Mughlai Darbar",
    cuisine: ["Mughlai", "Kebabs"],
    rating: 4.5,
    deliveryTime: 35,
    isOpen: false,
    minOrder: 250,
    priceRange: "₹₹",
    address: "67, Kilpauk, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0796, lng: 80.2497 },
    menu: [
      { category: "Kebabs", items: [
        { name: "Seekh Kebab",     price: 280, isVeg: false, available: true },
        { name: "Galouti Kebab",   price: 320, isVeg: false, available: true },
        { name: "Hara Bhara Kebab",price: 220, isVeg: true,  available: true }
      ]},
      { category: "Curries", items: [
        { name: "Nihari",            price: 360, isVeg: false, available: true },
        { name: "Shahi Paneer",      price: 280, isVeg: true,  available: true }
      ]}
    ]
  },
  {
    name: "Thai Orchid",
    cuisine: ["Thai", "Asian"],
    rating: 4.3,
    deliveryTime: 30,
    isOpen: true,
    minOrder: 200,
    priceRange: "₹₹",
    address: "90, Egmore, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0782, lng: 80.2620 },
    menu: [
      { category: "Soups & Salads", items: [
        { name: "Tom Yum Soup",    price: 180, isVeg: false, available: true },
        { name: "Green Papaya Salad", price: 160, isVeg: true, available: true }
      ]},
      { category: "Mains", items: [
        { name: "Pad Thai Noodles",    price: 260, isVeg: false, available: true },
        { name: "Thai Green Curry",    price: 300, isVeg: false, available: true },
        { name: "Pineapple Fried Rice",price: 240, isVeg: true,  available: true }
      ]}
    ]
  },
  {
    name: "Mediterranean Breeze",
    cuisine: ["Mediterranean", "Lebanese"],
    rating: 4.4,
    deliveryTime: 35,
    isOpen: true,
    minOrder: 300,
    priceRange: "₹₹₹",
    address: "15, Kotturpuram, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0122, lng: 80.2473 },
    menu: [
      { category: "Mezze", items: [
        { name: "Hummus & Pita",   price: 180, isVeg: true,  available: true },
        { name: "Falafel Wrap",    price: 220, isVeg: true,  available: true },
        { name: "Tabbouleh",       price: 160, isVeg: true,  available: true }
      ]},
      { category: "Grills", items: [
        { name: "Shish Tawook",    price: 380, isVeg: false, available: true },
        { name: "Lamb Kebab",      price: 420, isVeg: false, available: true }
      ]}
    ]
  },
  {
    name: "Chaat Corner",
    cuisine: ["Chaat", "Street Food"],
    rating: 4.2,
    deliveryTime: 20,
    isOpen: true,
    minOrder: 80,
    priceRange: "₹",
    address: "3, Besant Nagar, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 12.9990, lng: 80.2661 },
    menu: [
      { category: "Chaat", items: [
        { name: "Pani Puri",         price: 60,  isVeg: true, available: true },
        { name: "Bhel Puri",         price: 70,  isVeg: true, available: true },
        { name: "Sev Puri",          price: 70,  isVeg: true, available: true },
        { name: "Dahi Puri",         price: 80,  isVeg: true, available: true }
      ]},
      { category: "Snacks", items: [
        { name: "Aloo Tikki",       price: 80,  isVeg: true, available: true },
        { name: "Corn Chaat",       price: 90,  isVeg: true, available: true }
      ]}
    ]
  },
  {
    name: "The Pasta Place",
    cuisine: ["Pasta", "Italian"],
    rating: 4.1,
    deliveryTime: 25,
    isOpen: true,
    minOrder: 200,
    priceRange: "₹₹",
    address: "28, Velachery, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 12.9753, lng: 80.2199 },
    menu: [
      { category: "Pasta", items: [
        { name: "Penne Arrabbiata",     price: 260, isVeg: true,  available: true },
        { name: "Spaghetti Carbonara",  price: 320, isVeg: false, available: true },
        { name: "Pesto Pasta",          price: 280, isVeg: true,  available: true },
        { name: "Chicken Alfredo",      price: 360, isVeg: false, available: true }
      ]},
      { category: "Starters", items: [
        { name: "Bruschetta",     price: 160, isVeg: true,  available: true },
        { name: "Caesar Salad",   price: 200, isVeg: false, available: true }
      ]}
    ]
  },
  {
    name: "Korean BBQ House",
    cuisine: ["Korean"],
    rating: 4.5,
    deliveryTime: 35,
    isOpen: true,
    minOrder: 350,
    priceRange: "₹₹₹",
    address: "52, Porur, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0367, lng: 80.1571 },
    menu: [
      { category: "BBQ", items: [
        { name: "Korean Beef BBQ",     price: 580, isVeg: false, available: true },
        { name: "Spicy Pork Belly",    price: 520, isVeg: false, available: true },
        { name: "Tofu BBQ",            price: 380, isVeg: true,  available: true }
      ]},
      { category: "Bowls", items: [
        { name: "Bibimbap",      price: 360, isVeg: false, available: true },
        { name: "Kimchi Fried Rice", price: 280, isVeg: false, available: true }
      ]}
    ]
  },
  {
    name: "Healthy Bites",
    cuisine: ["Healthy", "Salads"],
    rating: 4.3,
    deliveryTime: 20,
    isOpen: true,
    minOrder: 150,
    priceRange: "₹₹",
    address: "11, Sholinganallur, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 12.9010, lng: 80.2278 },
    menu: [
      { category: "Salads", items: [
        { name: "Quinoa Bowl",       price: 240, isVeg: true,  available: true },
        { name: "Greek Salad",       price: 200, isVeg: true,  available: true },
        { name: "Grilled Chicken Salad", price: 280, isVeg: false, available: true }
      ]},
      { category: "Wraps", items: [
        { name: "Hummus Veggie Wrap",   price: 200, isVeg: true,  available: true },
        { name: "Grilled Chicken Wrap", price: 240, isVeg: false, available: true }
      ]}
    ]
  },
  {
    name: "Rajasthani Thali",
    cuisine: ["Rajasthani", "Thali"],
    rating: 4.6,
    deliveryTime: 30,
    isOpen: true,
    minOrder: 180,
    priceRange: "₹₹",
    address: "9, Vadapalani, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0522, lng: 80.2123 },
    menu: [
      { category: "Thali", items: [
        { name: "Rajasthani Veg Thali",  price: 280, isVeg: true,  available: true },
        { name: "Dal Baati Churma",      price: 220, isVeg: true,  available: true }
      ]},
      { category: "Sweets", items: [
        { name: "Ghewar",     price: 120, isVeg: true, available: true },
        { name: "Malpua",     price: 100, isVeg: true, available: true }
      ]}
    ]
  },
  {
    name: "Dim Sum Delight",
    cuisine: ["Dim Sum", "Chinese"],
    rating: 4.4,
    deliveryTime: 30,
    isOpen: false,
    minOrder: 200,
    priceRange: "₹₹",
    address: "37, Purasaiwalkam, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0898, lng: 80.2593 },
    menu: [
      { category: "Dim Sum", items: [
        { name: "Steamed Prawn Dumplings",  price: 280, isVeg: false, available: true },
        { name: "Veg Har Gow",             price: 220, isVeg: true,  available: true },
        { name: "Pork Siu Mai",            price: 260, isVeg: false, available: true }
      ]},
      { category: "Noodles", items: [
        { name: "Wonton Noodle Soup",  price: 220, isVeg: false, available: true },
        { name: "Char Kway Teow",      price: 240, isVeg: false, available: true }
      ]}
    ]
  },
  {
    name: "Tandoor Express",
    cuisine: ["Tandoor", "North Indian"],
    rating: 4.3,
    deliveryTime: 25,
    isOpen: true,
    minOrder: 180,
    priceRange: "₹₹",
    address: "19, Anna Nagar, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0892, lng: 80.2096 },
    menu: [
      { category: "Tandoor Starters", items: [
        { name: "Tandoori Chicken",    price: 320, isVeg: false, available: true },
        { name: "Paneer Tikka",        price: 260, isVeg: true,  available: true },
        { name: "Fish Tikka",          price: 340, isVeg: false, available: true }
      ]},
      { category: "Breads", items: [
        { name: "Tandoori Roti",  price: 30, isVeg: true, available: true },
        { name: "Missi Roti",     price: 50, isVeg: true, available: true },
        { name: "Laccha Paratha", price: 60, isVeg: true, available: true }
      ]}
    ]
  },
  {
    name: "Mexican Fiesta",
    cuisine: ["Mexican"],
    rating: 4.0,
    deliveryTime: 25,
    isOpen: true,
    minOrder: 200,
    priceRange: "₹₹",
    address: "61, Chromepet, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 12.9516, lng: 80.1462 },
    menu: [
      { category: "Tacos & Burritos", items: [
        { name: "Chicken Burrito",   price: 280, isVeg: false, available: true },
        { name: "Veg Tacos (2 pcs)", price: 220, isVeg: true,  available: true },
        { name: "Beef Taco",         price: 260, isVeg: false, available: true }
      ]},
      { category: "Extras", items: [
        { name: "Nachos with Salsa",  price: 160, isVeg: true, available: true },
        { name: "Guacamole & Chips",  price: 180, isVeg: true, available: true }
      ]}
    ]
  },
  {
    name: "The Kebab House",
    cuisine: ["Kebabs", "Arabian"],
    rating: 4.5,
    deliveryTime: 30,
    isOpen: true,
    minOrder: 200,
    priceRange: "₹₹",
    address: "44, Triplicane, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0628, lng: 80.2786 },
    menu: [
      { category: "Kebabs", items: [
        { name: "Shish Kebab",         price: 280, isVeg: false, available: true },
        { name: "Adana Kebab",         price: 300, isVeg: false, available: true },
        { name: "Paneer Shashlik",     price: 240, isVeg: true,  available: true }
      ]},
      { category: "Rice & Bread", items: [
        { name: "Kabsa Rice",   price: 280, isVeg: false, available: true },
        { name: "Pita Bread",   price: 60,  isVeg: true,  available: true }
      ]}
    ]
  },
  {
    name: "The Continental",
    cuisine: ["Continental", "American"],
    rating: 4.2,
    deliveryTime: 30,
    isOpen: true,
    minOrder: 300,
    priceRange: "₹₹₹",
    address: "72, Nungambakkam High Road, Chennai",
    status: "ACTIVE",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", lat: 13.0591, lng: 80.2446 },
    menu: [
      { category: "Starters", items: [
        { name: "Chicken Soup",        price: 160, isVeg: false, available: true },
        { name: "Mushroom Bruschetta", price: 180, isVeg: true,  available: true }
      ]},
      { category: "Mains", items: [
        { name: "Grilled Salmon",       price: 580, isVeg: false, available: true },
        { name: "Chicken Stroganoff",   price: 420, isVeg: false, available: true },
        { name: "Mushroom Risotto",     price: 360, isVeg: true,  available: true }
      ]}
    ]
  }
];

// Drop existing test data and insert fresh
print("Inserting 20 test restaurants...");

const result = db.restaurants.insertMany(restaurants);
print(`✅ Inserted ${result.insertedIds ? Object.keys(result.insertedIds).length : 0} restaurants successfully.`);
print("Done! Restart food-service to clear any Redis cache.");
