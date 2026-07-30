import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    try {
      token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== "access") {
        return res.status(401).json({ message: "Not authorized, invalid token" });
      }
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Access token expired", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Populates req.user when a valid access token is present, but never blocks
// the request if one isn't — used by endpoints (like coupon validation) that
// both logged-in customers and guests can call.
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) return next();

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === "access") {
      req.user = await User.findById(decoded.id).select("-password");
    }
  } catch {
    // Invalid/expired token on an optional-auth route just means "treat as guest".
  }
  next();
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Admin access required" });
  }
};

