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
    lowStockThreshold: { type: Number, default: 5 },
    defaultLanguage: { type: String, enum: ["en", "bn"], default: "en" },
    // The number customers are told to "Send Money" to at checkout — shown
    // on the Checkout page and used by admins to cross-check submissions.
    bkashMerchantNumber: { type: String, default: "" },
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
