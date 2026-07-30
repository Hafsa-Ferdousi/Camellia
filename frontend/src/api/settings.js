import client from "./client";

// Public — used by Checkout to show accurate delivery/VAT estimates, and by
// LanguageContext to read the admin-configured default site language.
export const getPricing = () => client.get("/settings/pricing");
