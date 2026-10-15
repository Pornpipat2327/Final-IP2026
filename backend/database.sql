-- ==============================================================
-- HR Manager & Salary Analytics Database Schema
-- Table: Pornpipat_6730202327
-- ==============================================================

-- 1. Create Table: Pornpipat_6730202327
CREATE TABLE IF NOT EXISTS `Pornpipat_6730202327` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `position` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Active',
  `salary` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insert 8 Initial Employees (Mock Data ตามข้อสอบ)
INSERT INTO `Pornpipat_6730202327` (`id`, `name`, `position`, `status`, `salary`) VALUES
(1, 'John Doe', 'Software Engineer', 'Active', 45000.00),
(2, 'Jane Smith', 'HR Manager', 'Active', 55000.00),
(3, 'Mike Brown', 'Accountant', 'On Leave', 38000.00),
(4, 'Sara Lee', 'UX Designer', 'Active', 42000.00),
(5, 'Tom Wilson', 'Sales Executive', 'On Leave', 35000.00),
(6, 'Alice Chen', 'Data Analyst', 'Active', 62000.00),
(7, 'Bob Johnson', 'DevOps Engineer', 'Active', 78000.00),
(8, 'Carol White', 'Marketing Lead', 'Active', 48000.00)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);
