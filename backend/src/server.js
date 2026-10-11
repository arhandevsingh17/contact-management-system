const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({ message: "Contact Management API is running" });
});


app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});


app.use("/api/auth", authRoutes);

app.use("/api/contacts", contactRoutes);


app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    message: err.status ? err.message : "Internal server error",
  });
});

const PORT = process.env.PORT || 5001;

// Validate essential environment configuration before startup
if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  console.error("FATAL: JWT_SECRET environment variable is missing or blank.");
  process.exit(1);
}


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });