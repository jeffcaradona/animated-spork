/**
 * Demo script to verify database client functionality
 * Creates a SQLite database, performs CRUD operations, then reports success
 * 
 * This demonstrates that the complete database abstraction layer works end-to-end.
 * Run with: node demo-database.js
 * 
 * The script will create a demo.db file, perform operations, then close cleanly.
 * (demo.db can be safely deleted after - it's only for demonstration)
 */
/* global console, process */
/* eslint-disable no-console */

import { createDatabaseClient } from "./src/database/index.js";

const db = await createDatabaseClient({
  backend: "sqlite",
  databases: {
    default: {
      filename: "./demo.db",
    },
  },
});

console.log("🚀 Starting database demo...\n");
console.log("✅ Database client created");
console.log(`   Backend: ${db.backend}`);
console.log(`   Databases: ${db.databaseNames.join(", ")}\n`);

try {
  // Create a table
  console.log("📝 Creating users table...");
  await db.execute(
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  );
  console.log("✅ Table created\n");

  // Insert data
  console.log("➕ Inserting sample data...");
  const insertResult = await db.execute(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    ["Alice Johnson", "alice@example.com"]
  );
  console.log(`✅ Inserted ${insertResult.rowsAffected} row\n`);

  // Query data
  console.log("🔍 Querying data...");
  const queryResult = await db.query("SELECT * FROM users");
  console.log(`✅ Found ${queryResult.length} record(s):`);
  queryResult.forEach((row, idx) => {
    console.log(
      `   ${idx + 1}. ${row.name} (${row.email}) - Created: ${row.created_at}`
    );
  });
  console.log();

  // Update data
  console.log("✏️ Updating record...");
  const updateResult = await db.execute(
    "UPDATE users SET email = ? WHERE name = ?",
    ["alice.johnson@example.com", "Alice Johnson"]
  );
  console.log(`✅ Updated ${updateResult.rowsAffected} row(s)\n`);

  // Verify update
  console.log("🔍 Verifying update...");
  const updated = await db.query("SELECT email FROM users WHERE name = ?", [
    "Alice Johnson",
  ]);
  console.log(`✅ Updated email: ${updated[0].email}\n`);

  // Check health
  console.log("💊 Checking database health...");
  const isHealthy = await db.isHealthy();
  console.log(`✅ Database is healthy: ${isHealthy}\n`);

  // Get status
  console.log("📊 Database status:");
  const status = await db.getStatus();
  console.log(`   Healthy: ${status.healthy}`);
  console.log(`   Backend: ${status.backend}`);
  console.log(`   Configured databases:`);
  for (const [name, dbStatus] of Object.entries(status.databases)) {
    console.log(`     - ${name}: ${dbStatus.connected ? "connected" : "disconnected"}`);
  }
  console.log();

  console.log("🎉 Demo completed successfully!\n");
} catch (error) {
  console.error("❌ Error during demo:", error.message);
  process.exit(1);
} finally {
  // Clean up
  console.log("🧹 Cleaning up...");
  await db.close();
  console.log("✅ Database closed\n");
}
