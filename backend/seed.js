// ============================================================
// seed.js  —  Run once: cd backend && node seed.js
// ============================================================
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Category from "./models/Category.js";
import Product from "./models/Product.js";
import cloudinaryData from "./cloudinaryProducts.json" with { type: "json" };
import curatedProducts from "./curatedProducts.json" with { type: "json" };

dotenv.config();

const CATEGORY_DEFS = [
  { name: { en: "Kalira",              bn: "কলিরা"              }, slug: "kalira",              description: { en: "Traditional bridal kalira"       }, isFixed: true, sortOrder: 1 },
  { name: { en: "Chura",               bn: "চুড়া"               }, slug: "chura",               description: { en: "Bridal chura & bangles"           }, isFixed: true, sortOrder: 2 },
  { name: { en: "Bangles",             bn: "বালা"               }, slug: "bangles",             description: { en: "Classic bangles collection"        }, isFixed: true, sortOrder: 3 },
  { name: { en: "Necklace Set",        bn: "নেকলেস সেট"        }, slug: "necklace",            description: { en: "Bridal necklace collections"       }, isFixed: true, sortOrder: 4 },
  { name: { en: "Diamond Cut",         bn: "ডায়মন্ড কাট"       }, slug: "diamond-cut",         description: { en: "Diamond cut jewelry"               }, isFixed: true, sortOrder: 5 },
  { name: { en: "Wedding Accessories", bn: "ওয়েডিং এক্সেসরিজ" }, slug: "wedding-accessories", description: { en: "Complete wedding accessories"  }, isFixed: true, sortOrder: 6 },
  { name: { en: "Bridal Nath",         bn: "নথ"                 }, slug: "nath",                description: { en: "Traditional bridal nose rings"     }, isFixed: true, sortOrder: 7 },
  { name: { en: "Earrings & Tikli",    bn: "কানের দুল ও টিকলি" }, slug: "earrings-tikli",      description: { en: "Earrings and forehead tikli"        }, isFixed: true, sortOrder: 8 },
];

async function seed() {
  await connectDB();
  console.log("🌱 Upserting categories/products (existing _ids are preserved)...");
  // Deliberately NOT wiping Users, Category, or Product here. This script is
  // meant to be safe to re-run at any time — including after real orders
  // exist — so categories/products below are upserted by a stable natural
  // key rather than deleted and recreated. delete+recreate would hand every
  // row a brand-new _id on each run, silently orphaning every Order that
  // references the old one (Order.items.product would point at nothing).

  // ── Demo users ──
  // Only created the first time (if missing) — never overwrites or deletes
  // existing accounts, so re-running this script is safe even after real
  // customers have registered. NOTE: this hardcoded admin is for local/demo
  // use only. In production, don't run seed.js — set ADMIN_* env vars
  // instead and the server bootstraps the admin automatically on startup
  // (see utils/ensureAdmin.js).
  console.log("👤 Ensuring demo users exist...");
  const demoAnswerHash = await bcrypt.hash("demo", 10);
  const securityQuestion = "What is the name of your first pet?";

  const ensureDemoUser = async (data) => {
    const existing = await User.findOne({ email: data.email });
    if (existing) return;
    await User.create(data);
  };

  await Promise.all([
    ensureDemoUser({ username: "admin",     name: "Camellia Admin", email: "admin@camellia.com",  password: "Admin123!",    role: "admin",    phone: "+8801700000001", securityQuestion, securityAnswerHash: demoAnswerHash }),
    ensureDemoUser({ username: "customer1", name: "Hafsa Rahman",   email: "hafsa@example.com",   password: "Customer123!", role: "customer", phone: "+8801700000002", securityQuestion, securityAnswerHash: demoAnswerHash }),
  ]);

  // ── Categories ──
  // Upserted by slug (Category.slug is unique) instead of deleted + recreated,
  // so an existing category keeps its _id across re-runs.
  console.log("🏷️  Upserting categories...");
  const categoryBySlug = {};
  for (const def of CATEGORY_DEFS) {
    categoryBySlug[def.slug] = await Category.findOneAndUpdate(
      { slug: def.slug },
      { $set: def },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // ── Products ──
  // cloudinaryProducts.json has each category's uploaded products, 3 images
  // per product. curatedProducts.json has hand-written name/description/price
  // for the first N products of a category (in upload order), matched by index.
  // Each product is upserted by seedKey ("<categorySlug>-<productNo>", stable
  // across runs) instead of deleted + recreated, so it keeps its _id — any
  // Order placed against it stays valid after a re-seed.
  console.log("💍 Upserting products...");

  const productsBySlug = {};
  for (const p of cloudinaryData.products) {
    (productsBySlug[p.categorySlug] ??= []).push(p);
  }

  let productCount = 0;
  let activeCount = 0;
  for (const [slug, uploaded] of Object.entries(productsBySlug)) {
    const category = categoryBySlug[slug];
    const curated = curatedProducts[slug] || [];

    for (let i = 0; i < uploaded.length; i++) {
      const product = uploaded[i];
      const curatedInfo = curated[i];
      const doc = {
        seedKey: `${slug}-${product.productNo}`,
        name: curatedInfo ? curatedInfo.name : product.name,
        description: curatedInfo ? curatedInfo.description : product.description,
        basePrice: curatedInfo ? curatedInfo.basePrice : product.basePrice,
        totalStock: curatedInfo ? curatedInfo.totalStock : product.totalStock,
        category: category._id,
        images: product.images,
        isActive: true,
        isFeatured: curatedInfo ? Boolean(curatedInfo.isFeatured) : false,
      };
      await Product.findOneAndUpdate(
        { seedKey: doc.seedKey },
        { $set: doc },
        { upsert: true, setDefaultsOnInsert: true }
      );
      productCount += 1;
      if (doc.isActive) activeCount += 1;
    }
  }

  console.log("✅ Seed complete!\n");
  console.log("👤 Login credentials:");
  console.log("   Admin    → admin@camellia.com   / Admin123!");
  console.log("   Customer → hafsa@example.com    / Customer123!");
  console.log("   (forgot-password security answer for both demo accounts: \"demo\")");
  console.log(`💍 ${productCount} products (${activeCount} active) across ${Object.keys(categoryBySlug).length} categories.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error("❌ Seed failed:", err.message); process.exit(1); });
