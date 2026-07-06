require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const connectDB = require("./config/db");
const autoReactivateCards = require("./jobs/autoReactivateCards");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://card-management-git-main-akilhans-projects.vercel.app",
      "https://card-management-c11w.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/cards", require("./routes/cards"));
app.use("/api/settings", require("./routes/settings"));

const CRON_TIMEZONE = process.env.CRON_TIMEZONE || "Asia/Tashkent";

if (process.env.VERCEL !== "1") {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await connectDB();
        await autoReactivateCards();
      } catch (err) {
        console.error("[cron] Auto-reactivation error:", err.message);
      }
    },
    { timezone: CRON_TIMEZONE }
  );
  console.log(`[cron] Daily auto-reactivation scheduled (00:00 ${CRON_TIMEZONE})`);
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Card Management Backend is running",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});