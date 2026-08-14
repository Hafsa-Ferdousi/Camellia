const isProd = process.env.NODE_ENV === "production";

/**
 * Maps common Mongoose error shapes to a safe status + message, since their
 * raw .message can otherwise leak collection/field/index names to clients
 * (e.g. "E11000 duplicate key error collection: camellia.categories ...").
 */
function describeKnownError(error) {
  if (error.name === "ValidationError") {
    const detail = Object.values(error.errors || {})
      .map((e) => e.message)
      .join(" ");
    return { status: 400, message: detail || "Invalid data submitted." };
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    return { status: 409, message: field ? `That ${field} is already in use.` : "Duplicate value." };
  }
  if (error.name === "CastError") {
    return { status: 400, message: "Invalid ID format." };
  }
  return null;
}

/**
 * Sends an error response, logging the full error server-side but never
 * leaking raw internals (stack traces, DB error text) to the client in
 * production. Recognized Mongoose errors get a friendly status + message
 * regardless of environment.
 */
export function sendError(res, error, fallbackStatus = 500, fallbackMessage = "Server error.") {
  console.error(error);

  const known = describeKnownError(error);
  if (known) return res.status(known.status).json({ message: known.message });

  const message = isProd && fallbackStatus >= 500 ? fallbackMessage : error.message;
  return res.status(fallbackStatus).json({ message });
}
