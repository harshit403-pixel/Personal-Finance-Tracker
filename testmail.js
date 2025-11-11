import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const mailOptions = {
  from: `"Finance Tracker Test" <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER, // send to yourself
  subject: "Test Email from Finance Tracker",
  text: "If you receive this, your Gmail App Password works 🎉",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) return console.error("❌ Test failed:", error);
  console.log("✅ Test email sent:", info.response);
});
