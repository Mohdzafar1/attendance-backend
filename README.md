# 📅 Attendance Management System — Backend

A comprehensive attendance management system backend built with **Node.js**, **Express**, and **PostgreSQL (Neon)**. Supports role-based access control for Admin, HR, and Employees with full attendance tracking, correction requests, and reporting capabilities.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Role-Based Access Control
| Role | Capabilities |
|------|-------------|
| **Admin** | Full system control, user management, attendance rules, audit logs |
| **HR** | Review correction requests, view & export all attendance records |
| **Employee** | Clock in/out, view own history, submit correction requests |

### Core Functionality
- ✅ JWT Authentication & Authorization
- ✅ Clock In / Clock Out with GPS location tracking
- ✅ Automatic total hours & overtime calculation
- ✅ Late arrival detection
- ✅ Correction request workflow (Pending → Approved / Rejected)
- ✅ Attendance history with date & department filters
- ✅ CSV export for HR reports
- ✅ Audit logging for compliance
- ✅ Database indexes & triggers for performance

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | v14+ | Runtime Environment |
| Express.js | v4.18+ | Web Framework |
| PostgreSQL (Neon) | v15+ | Cloud Database |
| JSON Web Token | v9.0+ | Authentication |
| bcryptjs | v2.4+ | Password Hashing |
| dotenv | v16.0+ | Environment Variables |
| pg | v8.0+ | PostgreSQL Client |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (v6 or higher)
- A [Neon](https://neon.tech/) account (or any PostgreSQL v12+ instance)

---

## 📁 Project Structure

```
attendance-backend/
├── src/
│   ├── config/
│   │   └── database.js          # PostgreSQL pool configuration (SSL for Neon)
│   ├── models/
│   │   ├── User.js              # User queries & helpers
│   │   
│   │  
│   │   
│   │   
│   │   
│   ├── middleware/
│   │   ├── auth.js              # JWT verification middleware
│   │   ├── roleCheck.js         # Role-based access guard
│   │   └── validation.js        # Request body validation
│   ├── controllers/
│   │   ├── authController.js    # Login, register, profile
│   │   ├── attendanceController.js # Clock in/out, history
│   │   ├── correctionController.js # Submit & review corrections
│   │   ├── adminController.js   # User management, rules, audit logs
│   │   └── hrController.js      # HR reports, all attendance records
│   ├── routes/
│   │   ├── authRoutes.js        # /api/auth/*
│   │   ├── attendanceRoutes.js  # /api/attendance/*
│   │   ├── correctionRoutes.js  # /api/corrections/*
│   │   ├── adminRoutes.js       # /api/admin/*
│   │   └── hrRoutes.js          # /api/hr/*
│   ├── utils/
│   │   └── helpers.js           # Date utils, hour calculations
│   └── app.js                   # Express app setup, middleware, routes
├── .env                         # Environment variables (never commit)
├── .env.example                 # Example env file for reference
├── package.json
├── insert-data.js               # One-shot DB setup + seed script
├── init.sql                     # Raw SQL schema (reference only)
├── seed.sql                     # Raw SQL seed data (reference only)
└── server.js                    # Entry point — starts HTTP server
```

---

## 🚀 Installation

### Step 1: Clone the repository
```bash
git clone https://github.com/yourusername/attendance-backend.git
cd attendance-backend
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Configure environment variables
```bash
cp .env.example .env
# Then edit .env with your actual values (see below)
```

### Step 4: Setup database & seed data
```bash
npm run insert-data
```

### Step 5: Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (Neon PostgreSQL)
DB_HOST=ep-your-db-host.neon.tech
DB_PORT=5432
DB_USER=neondb_owner
DB_PASSWORD=your_password
DB_NAME=neondb

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

> ⚠️ **Never commit your `.env` file.** Add it to `.gitignore`.

---

## 🗄️ Database Setup

This project uses **Neon** (serverless PostgreSQL). The `insert-data.js` script handles everything — table creation, indexes, triggers, views, and seed data — in one command.

```bash
npm run insert-data
```

What the script creates:

| Object | Details |
|--------|---------|
| **Tables** | `roles`, `users`, `attendance_records`, `correction_requests`, `attendance_rules`, `audit_logs` |
| **Indexes** | On email, role, date, status columns for fast queries |
| **Triggers** | Auto-updates `updated_at` on every table |
| **Views** | `v_attendance_summary`, `v_hr_dashboard` |
| **Seed Data** | 7 users, 35 attendance records (7 days), 3 correction requests |

### Sample Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | password123 |
| HR | hr@company.com | password123 |
| Employee | john@company.com | password123 |
| Employee | jane@company.com | password123 |
| Employee | mike@company.com | password123 |
| Employee | sara@company.com | password123 |
| Employee | raj@company.com | password123 |

---

## ▶️ Running the Application

```bash
# Development mode (nodemon)
npm run dev

# Production mode
npm start

# Setup database + seed all data
npm run insert-data
```

Add these to your `package.json` scripts:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "insert-data": "node insert-data.js"
}
```

Server runs at: **http://localhost:5000**

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

### 🔑 Auth Routes — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/login` | Public | Login and receive JWT token |
| POST | `/register` | Admin | Register a new user |
| GET | `/profile` | All roles | Get current user profile |
| PUT | `/profile` | All roles | Update own profile |
| POST | `/logout` | All roles | Logout |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "john@company.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 3,
    "username": "john_doe",
    "email": "john@company.com",
    "role": "employee",
    "full_name": "John Doe",
    "department": "Engineering"
  }
}
```

---

### 🕐 Attendance Routes — `/api/attendance`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/clock-in` | Employee | Clock in with optional location |
| POST | `/clock-out` | Employee | Clock out |
| GET | `/today` | Employee | Get today's attendance status |
| GET | `/history` | Employee | Get own attendance history |
| GET | `/history?start_date=&end_date=` | Employee | Filtered history |

**Clock In Request:**
```json
POST /api/attendance/clock-in
{
  "latitude": 28.5689,
  "longitude": 77.2869
}
```

---

### 📝 Correction Routes — `/api/corrections`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Employee | Submit a correction request |
| GET | `/` | Employee | Get own correction requests |
| GET | `/all` | HR / Admin | Get all correction requests |
| PUT | `/:id/approve` | HR / Admin | Approve a correction |
| PUT | `/:id/reject` | HR / Admin | Reject a correction |

**Submit Correction:**
```json
POST /api/corrections
{
  "request_type": "missed_out_time",
  "request_date": "2026-06-07",
  "reason": "Forgot to clock out due to urgent meeting",
  "requested_out_time": "2026-06-07T18:00:00"
}
```

---

### 👥 HR Routes — `/api/hr`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/attendance` | HR / Admin | All attendance records (filterable) |
| GET | `/attendance?start_date=&end_date=&department=&status=` | HR / Admin | Filtered records |
| GET | `/dashboard` | HR / Admin | Dashboard stats |
| GET | `/employees` | HR / Admin | List all employees |

---

### ⚙️ Admin Routes — `/api/admin`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin | List all users |
| POST | `/users` | Admin | Create a new user |
| PUT | `/users/:id` | Admin | Update a user |
| DELETE | `/users/:id` | Admin | Deactivate a user |
| GET | `/rules` | Admin | Get attendance rules |
| PUT | `/rules/:id` | Admin | Update attendance rule |
| GET | `/audit-logs` | Admin | View audit logs |

---

## 🔧 Troubleshooting

### ❌ `connection is insecure (try using sslmode=require)`
Neon requires SSL. Make sure your database config has:
```js
ssl: { rejectUnauthorized: false }
```

### ❌ `relation "roles" does not exist`
Tables haven't been created yet. Run:
```bash
npm run insert-data
```

### ❌ `JWT malformed` or `invalid token`
- Make sure the `Authorization` header is formatted as `Bearer <token>`
- Check that `JWT_SECRET` in `.env` matches what was used to sign the token

### ❌ `Cannot find module 'bcryptjs'`
```bash
npm install bcryptjs pg jsonwebtoken dotenv express
```

### ❌ Port already in use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.
