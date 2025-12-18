import { upload } from "../middleware/upload";
import { processReceiptOCR } from "../controller/ocr.controller";
import { Router } from "express";

const router = Router()

router.post(
  "/receipt",
  upload.single("receipt"), // field name from frontend
  processReceiptOCR
);

export default router