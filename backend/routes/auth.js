import express from "express";
import bcrypt from "bcrypt";
import User from "C:/Users/Hp/OneDrive/Desktop/welt/bbb/Personal-Finance-Tracker-main/backend/models/usermodel.js";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "All fields required" });

    // check if email or username exists
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: "Email or username already taken" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashed });
    await user.save();
    return res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    // For now we return simple success; later add JWT/session.
    return res.json({ message: "Login successful", user: { id: user._id, username: user.username, email: user.email }});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
