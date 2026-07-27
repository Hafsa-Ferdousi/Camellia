// Products/categories store bilingual { en, bn } text in the DB. Pick the
// active UI language's value, falling back to English if a bn translation
// hasn't been entered yet.
export const localized = (field, language) => field?.[language] || field?.en || "";
