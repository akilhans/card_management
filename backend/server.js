require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect to MongoDB
connectDB()
  .then(() => console.log("Mongo connected"))
  .catch(console.error);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://card-management-git-main-akilhans-projects.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/owners", require("./routes/owners"));
app.use("/api/cards", require("./routes/cards"));
app.use("/api/assignments", require("./routes/assignments"));
app.use("/api/settings", require("./routes/settings"));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Card Management Backend is running",
  });
});

// Export for Vercel
module.exports = app;

// Run locally only
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}