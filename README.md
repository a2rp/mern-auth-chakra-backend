# mern-auth-chakra-backend

Cookie-based JWT auth API for a MERN app (Express + MongoDB + Chakra UI front-end).

-   Uses **HttpOnly** cookies (no localStorage)
-   Passwords hashed with **bcrypt**
-   Input validation with **zod**
-   Role-based access (**user**, **admin**)

---

## Requirements

-   Node.js **18+**
-   MongoDB **6+** running locally (or a cloud URI)

---

## Quick start

```bash
# 1) Install deps
npm i

# 2) Copy env and edit values
cp .env.example .env     # or create .env using the table below

# 3) Start dev server (nodemon)
npm run dev

# API will listen on: http://localhost:1198
```

## Environment variables

Create a .env file in the project root:

```bash
NODE_ENV=development
PORT=1198

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mern_auth_chakra

# JWT signing secret
JWT_SECRET=replace-with-a-long-random-string

# CORS / cookies
FRONTEND_URL=http://localhost:5173
COOKIE_DOMAIN=localhost

# Notes

# In production, set NODE_ENV=production and use a strong JWT_SECRET.

# When you deploy behind HTTPS,
# set the cookie to Secure (the code already does this automatically when NODE_ENV=production).
```

## Scripts

```bash
{
  "dev": "nodemon index.js",
  "start": "node index.js",
}
```
