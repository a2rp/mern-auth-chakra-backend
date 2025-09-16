require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose"); // for clean shutdown
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { connectDB } = require("./src/config/db");

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;

// core middleware
app.set("trust proxy", 1);
app.use(helmet());
app.use(morgan(isProd ? "combined" : "dev"));
app.use(express.json());
app.use(cookieParser());

// CORS with credentials
const allowed = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim());

app.use(
    cors({
        origin(origin, cb) {
            if (!origin) return cb(null, true); // Postman/CLI
            cb(
                allowed.includes(origin)
                    ? null
                    : new Error("Not allowed by CORS"),
                true
            );
        },
        credentials: true,
    })
);

// rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// routes
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/users", require("./src/routes/user.routes"));
app.use("/api/admin", require("./src/routes/admin.routes")); // <-- admin mounted

// api 404
app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ ok: false, message: "Not found" });
    }
    next();
});

// errors
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({
        ok: false,
        message: err.message || "Server error",
    });
});

// start
connectDB()
    .then(() => {
        app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error("Boot error:", err.message);
        process.exit(1);
    });

// graceful shutdown
process.on("SIGINT", async () => {
    await mongoose.connection.close();
    process.exit(0);
});
