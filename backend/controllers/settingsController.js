import Setting from "../models/Setting.js";

// GET /api/settings/pricing — public, read-only. Checkout needs the current
// delivery charges and VAT rate to show an accurate estimate before
// submitting; the real total is still computed server-side at checkout time.
export const getPublicPricing = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    res.json({
      vatRate: settings.vatRate,
      defaultDeliveryCharge: settings.defaultDeliveryCharge,
      districtDeliveryCharges: settings.districtDeliveryCharges,
      defaultLanguage: settings.defaultLanguage,
      bkashMerchantNumber: settings.bkashMerchantNumber,
      bkashNumberType: settings.bkashNumberType,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
