// ============================================================
// seed.js  —  Run once: cd backend && node seed.js
// ============================================================
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Category from "./models/Category.js";
import Product from "./models/Product.js";

dotenv.config();

// Helper to build image arrays from /products/ folder
const img  = (...nums) => nums.map(n => `/products/c${n}.jpg`);
const bgl  = (...nums) => nums.map(n => `/products/bangles_${n}.jpg`);
const wed  = (...nums) => nums.map(n => `/products/wedding_${n}.jpg`);
const nec  = (...nums) => nums.map(n => `/products/necklace_${n}.jpg`);
const dia  = (...nums) => nums.map(n => `/products/diamond_${n}.jpg`);
const chu  = (...nums) => nums.map(n => `/products/chura_${n}.jpg`);
const kal  = (...nums) => nums.map(n => `/products/kalira_${n}.jpg`);

async function seed() {
  await connectDB();
  console.log("🌱 Clearing existing data...");
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({})]);

  // ── Users ──
  console.log("👤 Creating users...");
  await Promise.all([
    User.create({ username: "admin",     name: "Camellia Admin", email: "admin@camellia.com",  password: "admin123",    role: "admin",    phone: "+8801700000001" }),
    User.create({ username: "customer1", name: "Hafsa Rahman",   email: "hafsa@example.com",   password: "customer123", role: "customer", phone: "+8801700000002" }),
  ]);

  // ── Categories ──
  console.log("🏷️  Creating categories...");
  const cats = await Category.insertMany([
    { name: { en: "Kalira",              bn: "কলিরা"         }, slug: "kalira",              description: { en: "Traditional bridal kalira"       }, isFixed: true, sortOrder: 1 },
    { name: { en: "Chura",               bn: "চুড়া"          }, slug: "chura",               description: { en: "Bridal chura & bangles"           }, isFixed: true, sortOrder: 2 },
    { name: { en: "Bangles",             bn: "বালা"           }, slug: "bangles",             description: { en: "Classic bangles collection"        }, isFixed: true, sortOrder: 3 },
    { name: { en: "Necklace Set",        bn: "নেকলেস সেট"    }, slug: "necklace",            description: { en: "Bridal necklace collections"       }, isFixed: true, sortOrder: 4 },
    { name: { en: "Diamond Cut",         bn: "ডায়মন্ড কাট"  }, slug: "diamond-cut",         description: { en: "Diamond cut jewelry"               }, isFixed: true, sortOrder: 5 },
    { name: { en: "Wedding Accessories", bn: "ওয়েডিং এক্সেসরিজ" }, slug: "wedding-accessories", description: { en: "Complete wedding accessories"  }, isFixed: true, sortOrder: 6 },
  ]);
  const [kalira, chura, bangles, necklace, diamond, wedding] = cats;

  // ── Products ──
  console.log("💍 Creating products...");
  await Product.insertMany([

    // ── KALIRA (new real images) ──
    {
      name: { en: "Royal Kalira Set", bn: "রয়্যাল কলিরা সেট" },
      description: { en: "Exquisite traditional kalira with intricate gold filigree work. Perfect for your special day." },
      basePrice: 4500, totalStock: 15, category: kalira._id,
      images: kal(1, 2, 3),
      variants: [
        { color: "Gold",      sku: "KAL-GOLD-001", price: 4500, stock: 8 },
        { color: "Rose Gold", sku: "KAL-ROSE-001", price: 4800, stock: 7 },
      ],
      isActive: true,
    },
    {
      name: { en: "Lotus Kalira", bn: "লোটাস কলিরা" },
      description: { en: "Delicate lotus-shaped kalira with pearl drops. A timeless bridal accessory." },
      basePrice: 3200, totalStock: 10, category: kalira._id,
      images: kal(4, 5, 6),
      variants: [
        { color: "Gold",   sku: "KAL-GOLD-002", price: 3200, stock: 6 },
        { color: "Silver", sku: "KAL-SIL-002",  price: 2800, stock: 4 },
      ],
      isActive: true,
    },
    {
      name: { en: "Peacock Kalira", bn: "ময়ূর কলিরা" },
      description: { en: "Stunning peacock motif kalira with emerald green enamel work." },
      basePrice: 5500, totalStock: 8, category: kalira._id,
      images: kal(7, 8, 9),
      isActive: true,
    },
    {
      name: { en: "Floral Kalira", bn: "ফ্লোরাল কলিরা" },
      description: { en: "Elegant floral kalira with delicate petal detailing in gold." },
      basePrice: 3800, totalStock: 8, category: kalira._id,
      images: kal(10, 11, 12),
      isActive: true,
    },
    {
      name: { en: "Bridal Kalira Premium", bn: "প্রিমিয়াম কলিরা" },
      description: { en: "Premium bridal kalira with layered gold chains and floral drops." },
      basePrice: 6200, totalStock: 5, category: kalira._id,
      images: kal(13, 14, 15),
      variants: [
        { color: "Gold",      sku: "KAL-GOLD-003", price: 6200, stock: 3 },
        { color: "Rose Gold", sku: "KAL-ROSE-003", price: 6600, stock: 2 },
      ],
      isActive: true,
    },
    {
      name: { en: "Chandelier Kalira", bn: "ঝুমঝুম কলিরা" },
      description: { en: "Chandelier-style kalira with cascading pearl and gold drops." },
      basePrice: 4800, totalStock: 12, category: kalira._id,
      images: kal(16, 17, 18),
      isActive: true,
    },

    // ── CHURA (new real images) ──
    {
      name: { en: "Bridal Chura Set (21 pcs)", bn: "ব্রাইডাল চুড়া সেট" },
      description: { en: "Complete 21-piece bridal chura set in rich red with gold detailing. A must-have for weddings." },
      basePrice: 2800, totalStock: 20, category: chura._id,
      images: chu(1, 2, 3),
      variants: [
        { color: "Red & Gold",    sku: "CHU-RED-001", price: 2800, stock: 12 },
        { color: "Maroon & Gold", sku: "CHU-MAR-001", price: 3000, stock: 8  },
      ],
      isActive: true,
    },
    {
      name: { en: "Diamond Chura (12 pcs)", bn: "ডায়মন্ড চুড়া" },
      description: { en: "Elegant diamond-finish chura with crystal embellishments. Modern yet traditional." },
      basePrice: 3800, totalStock: 14, category: chura._id,
      images: chu(4, 5, 6),
      isActive: true,
    },
    {
      name: { en: "Kundan Chura Set", bn: "কুন্দন চুড়া" },
      description: { en: "Beautiful kundan-set chura bangles with meenakari back. Heirloom quality." },
      basePrice: 4200, totalStock: 6, category: chura._id,
      images: chu(7, 8, 9),
      isActive: true,
    },
    {
      name: { en: "Silk Thread Chura", bn: "সিল্ক থ্রেড চুড়া" },
      description: { en: "Handmade silk thread chura with gold detailing. Lightweight and comfortable." },
      basePrice: 1800, totalStock: 25, category: chura._id,
      images: chu(10, 11, 12),
      isActive: true,
    },
    {
      name: { en: "Pearl Chura Bangles", bn: "পার্ল চুড়া" },
      description: { en: "Delicate pearl-studded chura set for an elegant bridal look." },
      basePrice: 3200, totalStock: 10, category: chura._id,
      images: chu(13, 14, 15),
      isActive: true,
    },

    // ── BANGLES (new real images) ──
    {
      name: { en: "Classic Gold Bangles (Set of 6)", bn: "ক্লাসিক গোল্ড বালা" },
      description: { en: "Timeless classic gold bangles. Perfect for daily wear or special occasions." },
      basePrice: 3500, totalStock: 20, category: bangles._id,
      images: bgl(1, 2, 3),
      variants: [
        { color: "Gold",   sku: "BGL-GOLD-001", price: 3500, stock: 12 },
        { color: "Silver", sku: "BGL-SIL-001",  price: 3000, stock: 8  },
      ],
      isActive: true,
    },
    {
      name: { en: "Twisted Gold Bangles", bn: "টুইস্টেড গোল্ড বালা" },
      description: { en: "Elegantly twisted gold bangles with a modern design. Sold as a set of 4." },
      basePrice: 2800, totalStock: 15, category: bangles._id,
      images: bgl(4, 5, 6),
      isActive: true,
    },

    // ── NECKLACE SET (new real images) ──
    {
      name: { en: "Bridal Necklace Set", bn: "ব্রাইডাল নেকলেস সেট" },
      description: { en: "Magnificent multi-layered bridal necklace set with matching earrings and tikka." },
      basePrice: 8500, totalStock: 8, category: necklace._id,
      images: nec(1, 2, 3),
      variants: [
        { color: "Gold",       sku: "NEC-GOLD-001", price: 8500, stock: 5 },
        { color: "White Gold", sku: "NEC-WHT-001",  price: 9200, stock: 3 },
      ],
      isActive: true,
    },
    {
      name: { en: "Choker Necklace Set", bn: "চোকার নেকলেস" },
      description: { en: "Stunning velvet choker with antique gold pendant. Versatile for festive and wedding wear." },
      basePrice: 2400, totalStock: 18, category: necklace._id,
      images: nec(4, 5, 6),
      isActive: true,
    },
    {
      name: { en: "Layered Gold Necklace", bn: "লেয়ারড গোল্ড নেকলেস" },
      description: { en: "Three-layered gold necklace with delicate coin charms. Modern bridal favourite." },
      basePrice: 5600, totalStock: 5, category: necklace._id,
      images: nec(7, 8, 9),
      isActive: true,
    },
    {
      name: { en: "Pearl Necklace Set", bn: "পার্ল নেকলেস সেট" },
      description: { en: "Elegant pearl necklace with matching earrings and bracelet. A complete bridal jewellery set." },
      basePrice: 6800, totalStock: 7, category: necklace._id,
      images: nec(10, 1, 2),
      isActive: true,
    },

    // ── DIAMOND CUT (new real images) ──
    {
      name: { en: "Diamond Cut Bangles (6 pcs)", bn: "ডায়মন্ড কাট বালা" },
      description: { en: "Precision diamond-cut gold bangles that catch light beautifully." },
      basePrice: 6200, totalStock: 5, category: diamond._id,
      images: dia(1, 2, 3),
      variants: [
        { color: "22K Gold", sku: "DIA-22K-001", price: 6200, stock: 3 },
        { color: "18K Gold", sku: "DIA-18K-001", price: 5400, stock: 2 },
      ],
      isActive: true,
    },
    {
      name: { en: "Diamond Cut Ring", bn: "ডায়মন্ড কাট আংটি" },
      description: { en: "Beautiful solitaire-style diamond cut ring for engagement or everyday elegance." },
      basePrice: 3800, totalStock: 12, category: diamond._id,
      images: dia(4, 5, 6),
      isActive: true,
    },
    {
      name: { en: "Diamond Cut Earrings", bn: "ডায়মন্ড কাট কানের দুল" },
      description: { en: "Sparkling diamond-cut drop earrings. Lightweight and perfect for daily wear." },
      basePrice: 2200, totalStock: 20, category: diamond._id,
      images: dia(7, 8, 9),
      isActive: true,
    },
    {
      name: { en: "Diamond Cut Necklace", bn: "ডায়মন্ড কাট নেকলেস" },
      description: { en: "Dazzling diamond-cut necklace set for weddings and special events." },
      basePrice: 9500, totalStock: 4, category: diamond._id,
      images: dia(10, 1, 2),
      isActive: true,
    },

    // ── WEDDING ACCESSORIES (new real images) ──
    {
      name: { en: "Complete Bridal Set", bn: "সম্পূর্ণ ব্রাইডাল সেট" },
      description: { en: "The ultimate bridal jewellery set — necklace, earrings, bangles, tikka, nose ring and more." },
      basePrice: 18500, totalStock: 3, category: wedding._id,
      images: wed(1, 2, 3),
      variants: [
        { color: "Gold",      sku: "WED-GOLD-001", price: 18500, stock: 2 },
        { color: "Rose Gold", sku: "WED-ROSE-001", price: 19800, stock: 1 },
      ],
      isActive: true,
    },
    {
      name: { en: "Reception Jewellery Set", bn: "রিসেপশন সেট" },
      description: { en: "Light yet stunning reception jewellery — perfect for the wedding reception ceremony." },
      basePrice: 12000, totalStock: 6, category: wedding._id,
      images: wed(4, 5, 6),
      isActive: true,
    },
    {
      name: { en: "Mehendi Ceremony Set", bn: "মেহেদি সেট" },
      description: { en: "Vibrant mehendi ceremony jewellery set with colourful stones and gold tones." },
      basePrice: 7500, totalStock: 9, category: wedding._id,
      images: wed(7, 8, 9),
      isActive: true,
    },
    {
      name: { en: "Holud Jewellery Set", bn: "হলুদ সেট" },
      description: { en: "Bright yellow-gold holud ceremony jewellery. Floral motifs with pearl drops." },
      basePrice: 6800, totalStock: 7, category: wedding._id,
      images: wed(10, 11, 12),
      isActive: true,
    },
    {
      name: { en: "Bridal Hair Accessories Set", bn: "ব্রাইডাল হেয়ার সেট" },
      description: { en: "Stunning bridal hair accessories including maang tikka, jhoomar, and pins." },
      basePrice: 4500, totalStock: 10, category: wedding._id,
      images: wed(13, 14, 15),
      isActive: true,
    },
    {
      name: { en: "Bridal Maang Tikka", bn: "মাং টিকা" },
      description: { en: "Gorgeous bridal maang tikka with pearl and kundan work. Adjustable chain." },
      basePrice: 2800, totalStock: 15, category: wedding._id,
      images: wed(16, 17, 18),
      isActive: true,
    },
  ]);

  console.log("✅ Seed complete!\n");
  console.log("👤 Login credentials:");
  console.log("   Admin    → admin@camellia.com   / admin123");
  console.log("   Customer → hafsa@example.com    / customer123");
  console.log("💍 27 products across 6 categories.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error("❌ Seed failed:", err.message); process.exit(1); });
