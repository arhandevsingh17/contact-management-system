require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const { validateCorsConfig } = require("./config/corsConfig");

const PORT = process.env.PORT || 5001;

async function startServer() {
  // Validate before opening a DB connection so unsafe/incorrect production
  // CORS configuration fails fast and does not start a partially configured API.
  validateCorsConfig(process.env);

  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    throw new Error("JWT_SECRET environment variable is missing or blank.");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected successfully");

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  });
}

module.exports = app;
