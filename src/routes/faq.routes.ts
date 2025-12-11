import express from "express";
import { askAI } from "../controller/faq.controller";

const router = express.Router();
router.post("/faq", askAI);

export default router;
