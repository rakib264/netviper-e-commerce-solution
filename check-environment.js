#!/usr/bin/env node

/**
 * Environment Check Script
 *
 * Verifies that all required environment variables are set
 * for the new queue system to work correctly.
 */

// Load environment variables from .env file
require("dotenv").config();

console.log("🔍 Checking Environment Configuration...\n");

const requiredVars = {
  UPSTASH_REDIS_REST_URL: "Upstash Redis REST URL for queue management",
  UPSTASH_REDIS_REST_TOKEN: "Upstash Redis REST token for authentication",
  RESEND_API_KEY:
    "Resend API key for email delivery (get from resend.com/dashboard)",
  ADMIN_EMAIL:
    "YOUR actual email address where you want to receive notifications",
};

const optionalVars = {
  FROM_EMAIL: "Email address to send FROM (defaults to noreply@muscarimart.com)",
  FROM_NAME: "Name to send emails FROM (defaults to Muscari Mart)",
  NEXTAUTH_URL: "Base URL for the application",
  MONGODB_URI: "MongoDB connection string",
  NEXTAUTH_SECRET: "NextAuth secret for authentication",
};

let allRequired = true;

console.log("📋 Required Environment Variables:");
console.log("=====================================");

for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set (${value.substring(0, 20)}...)`);
  } else {
    console.log(`❌ ${varName}: Missing - ${description}`);
    allRequired = false;
  }
}

console.log("\n📋 Optional Environment Variables:");
console.log("==================================");

for (const [varName, description] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`⚠️  ${varName}: Not set - ${description}`);
  }
}

console.log("\n🔧 Dependencies Check:");
console.log("======================");

try {
  const packageJson = require("./package.json");
  const deps = packageJson.dependencies || {};

  const requiredDeps = ["@upstash/redis", "resend", "puppeteer"];

  const removedDeps = ["amqplib", "nodemailer"];

  console.log("Required dependencies:");
  requiredDeps.forEach((dep) => {
    if (deps[dep]) {
      console.log(`✅ ${dep}: ${deps[dep]}`);
    } else {
      console.log(`❌ ${dep}: Missing`);
      allRequired = false;
    }
  });

  console.log("\nRemoved dependencies:");
  removedDeps.forEach((dep) => {
    if (!deps[dep]) {
      console.log(`✅ ${dep}: Successfully removed`);
    } else {
      console.log(`⚠️  ${dep}: Still present (${deps[dep]})`);
    }
  });
} catch (error) {
  console.log("❌ Could not read package.json");
}

console.log("\n📁 File Structure Check:");
console.log("========================");

const fs = require("fs");
const path = require("path");

const requiredFiles = [
  "lib/queue.ts",
  "lib/resend.ts",
  "lib/pdf.ts",
  "app/api/processQueue/route.ts",
  "vercel.json",
];

const removedFiles = [
  "lib/rabbitmq.ts",
  "lib/email.ts",
  "lib/invoice.ts",
  "lib/consumerService.ts",
  "lib/eventHandlers.ts",
  "railway-consumers",
];

console.log("Required files:");
requiredFiles.forEach((file) => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}: Present`);
  } else {
    console.log(`❌ ${file}: Missing`);
    allRequired = false;
  }
});

console.log("\nRemoved files/directories:");
removedFiles.forEach((file) => {
  if (!fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}: Successfully removed`);
  } else {
    console.log(`⚠️  ${file}: Still present`);
  }
});

console.log("\n🎯 Environment Check Summary:");
console.log("=============================");

if (allRequired) {
  console.log("✅ All required configuration is present");
  console.log("🚀 Your system is ready to run!");
  console.log("\n📝 Next steps:");
  console.log("1. Deploy to Vercel");
  console.log("2. Set up domain authentication in Resend dashboard");
  console.log("3. Test the queue system with: node test-queue-system.js");
} else {
  console.log("❌ Some required configuration is missing");
  console.log(
    "⚠️  Please set up the missing environment variables and dependencies",
  );
  console.log(
    "\n📖 Refer to QUEUE_SYSTEM_README.md for detailed setup instructions",
  );
}

console.log("\n📚 Documentation:");
console.log("- QUEUE_SYSTEM_README.md - Complete migration guide");
console.log("- IMPLEMENTATION_SUMMARY.md - Technical implementation details");
console.log("- /api/processQueue?action=health - System health check");
console.log("- /api/processQueue?action=stats - Queue statistics");
