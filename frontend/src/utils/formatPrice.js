export const formatPrice = (amount, language, decimals = 0) =>
  (Number(amount) || 0).toLocaleString(language === "bn" ? "bn-BD" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
