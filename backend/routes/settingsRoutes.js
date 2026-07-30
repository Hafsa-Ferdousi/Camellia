import express from "express";
import { getPublicPricing } from "../controllers/settingsController.js";

const router = express.Router();

router.get("/pricing", getPublicPricing);

export default router;
