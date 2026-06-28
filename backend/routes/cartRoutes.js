import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect); // every cart route requires login

router.get("/", getCart);
router.post("/", addToCart);
router.patch("/:id", updateCartItem);
router.delete("/:id", removeCartItem);

export default router;
