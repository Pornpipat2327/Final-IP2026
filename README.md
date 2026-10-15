# HR Manager & Salary Analytics System (Final Exam 2026)

**Student ID:** 6730202327  
**Topic:** HR Manager & Salary Analytics System  
**Course:** Internet Programming (2026)  

---

## 📁 Project Structure

```text
Std6730202327IPFinal2026
├── backend/                  # Express.js REST API Server
│   ├── config/
│   │   └── database.js       # MySQL Connection Pool & Auto-migration
│   ├── database.sql          # SQL Schema & Seed Data for phpMyAdmin
│   ├── Server.js             # API Routes, CRUD, and K-Means Algorithm
│   ├── test.js               # API Test Suite
│   ├── .env                  # Environment Variables
│   └── package.json
└── frontend/                 # React Native / Expo Application
    ├── app/
    │   ├── _layout.js        # Auth state evaluation & navigation
    │   ├── index.js          # Dashboard (CRUD UI, Stats & K-Means Results)
    │   └── login.js          # Authentication Login Screen
    ├── app.json
    └── package.json
```

---

## 🚀 How to Run

### 1. Backend Server (Node.js & Express)

```bash
cd backend
npm install
npm start
```
- **Server URL:** `http://localhost:3000`
- **Database:** Auto-connects to MySQL/phpMyAdmin (`ip_std6730202327`, table `Pornpipat_6730202327`). If MySQL is not running, it automatically operates in In-Memory fallback mode as required by Phase 1.

### 2. Frontend Application (React Native / Expo / Web)

```bash
cd frontend
npm install

# Run on Web (Browser)
npm run web

# Or run on Expo Go (Mobile)
npm start
```
- **Web App URL:** `http://localhost:8081`
- **Default Credentials:**
  - **Username:** `admin`
  - **Password:** `password123`

---

## 🛠️ Features Implemented

### Phase 1: Authentication & Employee Management
- `POST /api/login`: Accepts credentials, returns JWT token on success or 401 Unauthorized on failure.
- `GET /api/employees`: Returns all employee records.
- `POST /api/employees`: Adds a new employee with validation (Status 400 for empty fields).
- `PUT /api/employees/:id/status`: Toggles employee status between `Active` and `On Leave`.
- `DELETE /api/employees/:id`: Deletes employee with client-side confirmation dialog.

### Phase 2: Salary Clustering (1D K-Means, k=3)
- `GET /api/employees/salary-clusters`: Groups employee salaries into 3 distinct tiers (`Tier 1`, `Tier 2`, `Tier 3`) with centroids, member counts, and member lists.
- Frontend displays interactive summary cards with loading states.
