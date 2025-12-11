import { Request, Response } from "express";
import { projectFAQ } from "../faq/faqAI";

// Normalize function to lowercase and trim
const normalize = (str: string) => str.toLowerCase().trim();

export const askAI = (req: Request, res: Response) => {
  const { question } = req.body;
  const qNormalized = normalize(question);
  const words = qNormalized.split(/\s+/);

  // 1. Check greetings
  const isGreeting = projectFAQ.greetings.triggers.some((word: string) =>
    words.includes(normalize(word))
  );
  if (isGreeting) return res.json({ answer: projectFAQ.greetings.response });

  // 2. Check project overview
  if (projectFAQ.project_overview.questions.some((q: string) =>
    qNormalized.includes(normalize(q))
  )) {
    return res.json({ answer: projectFAQ.project_overview.answer });
  }

  // 3. Check tech stack
  if (projectFAQ.tech_stack.questions.some((q: string) =>
    qNormalized.includes(normalize(q))
  )) {
    return res.json({ answer: projectFAQ.tech_stack.answer });
  }

  // 4. Check database structure
  if (projectFAQ.database_structure.questions.some((q: string) =>
    qNormalized.includes(normalize(q))
  )) {
    return res.json({ answer: JSON.stringify(projectFAQ.database_structure.answer) });
  }

  // 5. Check features
  if (projectFAQ.features.questions.some((q: string) =>
    qNormalized.includes(normalize(q))
  )) {
    return res.json({ answer: projectFAQ.features.answer.join("\n") });
  }

  // 6. Check workflows
  for (const wfKey in projectFAQ.workflows) {
    const workflow = projectFAQ.workflows[wfKey];
    if (workflow.questions.some((q: string) => qNormalized.includes(normalize(q)))) {
      return res.json({ answer: workflow.answer.join("\n") });
    }
  }

  // 7. Check author questions
  for (const key in projectFAQ.author_questions) {
    if (key.endsWith("_q")) {
      const aKey = key.replace("_q", "_a");
      if (projectFAQ.author_questions[key].some((q: string) => qNormalized.includes(normalize(q)))) {
        return res.json({ answer: projectFAQ.author_questions[aKey] });
      }
    }
  }

  // 8. Fallback for unrelated questions
  return res.json({ answer: projectFAQ.ai_fallback.invalid_question_response });
};
