import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/wishlistController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/",              getWishlist);
router.post("/",             addToWishlist);
router.delete("/clear",      clearWishlist);
router.delete("/:productId", removeFromWishlist);

export default router;