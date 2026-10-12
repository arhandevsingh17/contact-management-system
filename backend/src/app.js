const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");
const { createCorsOptions } = require("./config/corsConfig");

const app = express();

app.use(cors(createCorsOptions()));
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

module.exports = app;
