import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },
  category: {
    name: {
      type: String,
      default: "Other",
    },
    emoji: {
      type: String,
      default: "📦",
    },
  },
  date: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
