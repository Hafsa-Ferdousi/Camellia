import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { username, name, email, password, phone } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ message: "User with this email or username already exists" });
    }

    const user = await User.create({ username, name, email, password, phone });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login — accepts username OR email
export const loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = email || username;

    // Try matching by email first, then username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json(req.user);
};
