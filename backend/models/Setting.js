import mongoose from "mongoose";

// Singleton document — there is only ever one settings row, fetched/created
// on demand so pricing has sane defaults before an admin ever visits Settings.
const settingSchema = new mongoose.Schema(
  {
    vatRate: { type: Number, default: 0.10 },
    defaultDeliveryCharge: { type: Number, default: 150 },
    districtDeliveryCharges: {
      type: [{ district: String, charge: Number }],
      default: [{ district: "Cox's Bazar", charge: 70 }],
    },
    lowStockThreshold: { type: Number, default: 10 },
    defaultLanguage: { type: String, enum: ["en", "bn"], default: "en" },
    // The number customers are told to "Send Money" to at checkout — shown
    // on the Checkout page and used by admins to cross-check submissions.
    // Hardcoded so every teammate's local database defaults to the same
    // number automatically (previously this was admin-configured per
    // database, so each teammate's own DB needed it entered manually).
    // Change this value here if the team's bKash number changes, then
    // re-share this file — no per-database Admin setup needed anymore.
    bkashMerchantNumber: { type: String, default: "01518986293" },
    bkashNumberType: { type: String, enum: ["personal", "merchant"], default: "personal" },
  },
  { timestamps: true }
);

settingSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

const Setting = mongoose.model("Setting", settingSchema);
export default Setting;