import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./models/usermodel.js";
import Transaction from "./models/transaction.js";
import nodemailer from "nodemailer";
import fs from "fs"; 

console.log("📧 DEBUG EMAIL_USER:", process.env.EMAIL_USER);
console.log("📧 DEBUG EMAIL_PASS length:", process.env.EMAIL_PASS?.length);



const app = express();

// =============================
// Middleware (Updated for large PDF uploads)
// =============================
app.use(express.json({ limit: "50mb" })); // increase from 10mb → 50mb
app.use(express.urlencoded({ limit: "50mb", extended: true })); // add this line
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

 
// =============================
// MongoDB Connection
// =============================
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/personalFinanceDB";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ DB connection error:", err));

// =============================
// JWT Verification Middleware
// =============================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key");
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

// =============================
// SIGNUP API
// =============================
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    console.log("✅ New user created:", newUser.email);
    res.status(201).json({ message: "Signup successful!" });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// =============================
// LOGIN API
// =============================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful!",
      token: token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// =============================
// GET ALL TRANSACTIONS (Protected)
// =============================
app.get("/api/transactions", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await Transaction.find({ userId }).sort({ date: -1 });
    res.status(200).json({ transactions });
  } catch (error) {
    console.error("❌ Fetch transactions error:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// =============================
// ADD TRANSACTION (Protected)
// =============================
app.post("/api/transactions", verifyToken, async (req, res) => {
  try {
    const { description, amount, type, date, category } = req.body;
    const userId = req.user.id;

    if (!description || !amount || !type || !date) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Parse and validate category
    let categoryObj = null;
    if (category) {
      if (typeof category === "string") {
        try { categoryObj = JSON.parse(category); } catch (e) { categoryObj = null; }
      } else {
        categoryObj = category;
      }

      if (!categoryObj || !categoryObj.name || !categoryObj.emoji) {
        return res.status(400).json({ message: "Invalid category format" });
      }
    } else {
      categoryObj = { name: "Other", emoji: "📦" };
    }

    const newTransaction = new Transaction({
      userId,
      description,
      amount: parseFloat(amount),
      type,
      date: new Date(date),
      category: categoryObj
    });

    await newTransaction.save();

    res.status(201).json({ 
      message: "Transaction added successfully", 
      transaction: newTransaction 
    });
  } catch (error) {
    console.error("❌ Add transaction error:", error);
    res.status(500).json({ message: "Failed to add transaction" });
  }
});

// =============================
// UPDATE TRANSACTION (Protected)
// =============================
app.put("/api/transactions/:id", verifyToken, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.user.id;
    const { description, amount, type, date, category } = req.body;

    const transaction = await Transaction.findOne({ _id: transactionId, userId });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // ✅ Validate category
    let categoryObj = transaction.category;
    if (category) {
      if (typeof category === "string") {
        try { categoryObj = JSON.parse(category); } catch (e) { categoryObj = null; }
      } else {
        categoryObj = category;
      }

      if (!categoryObj || !categoryObj.name || !categoryObj.emoji) {
        return res.status(400).json({ message: "Invalid category format" });
      }
    }

    const updatedFields = {
      description: description ?? transaction.description,
      amount: amount ? parseFloat(amount) : transaction.amount,
      type: type ?? transaction.type,
      date: date ? new Date(date) : transaction.date,
      category: categoryObj
    };

    const updated = await Transaction.findByIdAndUpdate(
      transactionId,
      updatedFields,
      { new: true }
    );

    res.status(200).json({ 
      message: "Transaction updated successfully", 
      transaction: updated 
    });
  } catch (error) {
    console.error("❌ Update transaction error:", error);
    res.status(500).json({ message: "Failed to update transaction" });
  }
});

// =============================
// DELETE TRANSACTION (Protected)
// =============================
app.delete("/api/transactions/:id", verifyToken, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.user.id;

    const transaction = await Transaction.findOne({ _id: transactionId, userId });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await Transaction.findByIdAndDelete(transactionId);
    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("❌ Delete transaction error:", error);
    res.status(500).json({ message: "Failed to delete transaction" });
  }
});

// =============================
// CATEGORY LIST (Optional API)
// =============================
app.get("/api/categories", (req, res) => {
  const categories = [
    { name: "Food", emoji: "🍔" },
    { name: "Transport", emoji: "🚗" },
    { name: "Entertainment", emoji: "🎬" },
    { name: "Shopping", emoji: "🛍️" },
    { name: "Bills", emoji: "💡" },
    { name: "Health", emoji: "💊" },
    { name: "Travel", emoji: "✈️" },
    { name: "Salary", emoji: "💰" },
    { name: "Other", emoji: "📦" }
  ];
  res.status(200).json({ categories });
});






app.post("/api/send-report", verifyToken, async (req, res) => {
  try {
    // ⬇️ pdfData is defined here
    const { pdfData } = req.body;
    const userEmail = req.user.email;

    if (!pdfData) {
      return res.status(400).json({ message: "No PDF data provided" });
    }

    // ✅ DEBUG LOG inside try block (no error now) 
    console.log("📦 Received PDF data length:", pdfData.length);

    // 🧪 Save locally for debugging
    fs.writeFileSync("debug_received.pdf", Buffer.from(pdfData, "base64"));
    console.log("✅ Saved debug_received.pdf for inspection");

    // 🧠 Gmail SMTP setup
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 📨 Email content + attachment
    const mailOptions = {
      from: `"Finance Tracker" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "📊 Your Monthly Finance Report",
      html: `
        <h2>Hi ${userEmail.split("@")[0]},</h2>
        <p>Here’s your <strong>Finance Tracker Monthly Report</strong> 📈</p>
        <p>Keep managing your money smartly and achieve your savings goals 💰</p>
        <br>
        <p>— The Finance Tracker Team</p>
      `,
      attachments: [
        {
          filename: `Finance_Report_${new Date().toISOString().slice(0,7)}.pdf`,
          content: Buffer.from(pdfData, "base64"), // ✅ Decode Base64 to binary
          contentType: "application/pdf"
        }
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Report sent successfully to ${userEmail}`);
    res.status(200).json({ message: "Report emailed successfully!" });

  } catch (error) {
    console.error("❌ Email sending error:", error);
    res.status(500).json({ message: "Failed to send report email" });
  }
});






// =============================
// TEST ROUTE
// =============================
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working fine ✅" });
});

// =============================
// Start Server
// =============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
