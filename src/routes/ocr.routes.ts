import { upload } from "../middleware/upload"
import { processReceiptOCR } from "../controller/ocr.controller"
import { Router } from "express"

const router = Router()

router.post( "/receipt", upload.single("receipt"),  processReceiptOCR)

export default router