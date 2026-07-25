// Strips keys that start with "$" or contain "." from req.body/query/params —
// these are the characters Mongo operators are built from, so left unchecked
// a client could inject e.g. { "guestInfo.email": { "$ne": null } } into a
// query object and bypass intended filters.
const isPlainObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (isPlainObject(value)) {
    const clean = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = sanitizeValue(value[key]);
    }
    return clean;
  }
  return value;
};

export const sanitizeInputs = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};
