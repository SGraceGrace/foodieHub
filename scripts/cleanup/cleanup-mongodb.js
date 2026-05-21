// FoodieHub MongoDB Cleanup Script
// Database: foodiehub_food (food-service + notification-service)
// Drops all documents from every collection, leaving indexes intact.
// Run with: mongosh foodiehub_food scripts/cleanup/cleanup-mongodb.js

const db = connect("mongodb://localhost:27017/foodiehub_food");

const collections = [
  "restaurants",
  "owner_approvals",
  "slides",
  "notifications",
  "notification_dismissals",
];

for (const name of collections) {
  const result = db.getCollection(name).deleteMany({});
  print(`  ${name}: deleted ${result.deletedCount} document(s)`);
}

print("MongoDB cleanup complete.");
