import { readFileSync } from "fs";
import path from "path";

export const projectFAQ = JSON.parse(
  readFileSync(path.join(__dirname, "project_faq.json"), "utf-8")
);
