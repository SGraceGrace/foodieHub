-- FoodieHub MySQL Cleanup Script
-- Database: foodiehub (user-service)
-- Clears all data while preserving table structure and seed roles/permissions.
-- Run with: mysql -u root -p foodiehub < cleanup-mysql.sql

USE foodiehub;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE user_restaurant_assignments;
TRUNCATE TABLE role_permissions;
TRUNCATE TABLE refresh_token;
TRUNCATE TABLE user_address;
TRUNCATE TABLE locations;
TRUNCATE TABLE partner_profile;
TRUNCATE TABLE activity_log;
TRUNCATE TABLE contact_message;
TRUNCATE TABLE `user`;
TRUNCATE TABLE roles;
TRUNCATE TABLE permissions;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'MySQL cleanup complete.' AS status;
