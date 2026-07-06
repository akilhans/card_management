const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post("/login", async (req, res) => {
  try {
    console.log("Login request:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password required",
      });
    }

    console.log("Finding user...");

    const user = await User.findOne({ username });

    console.log("User:", user);

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    console.log("Comparing password...");

    const isMatch = await bcrypt.compare(password, user.password);

    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        username: user.username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
      stack: err.stack,
    });
  }
});

module.exports = router;
