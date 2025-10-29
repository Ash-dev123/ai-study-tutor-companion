import { feature, product, featureItem, priceItem } from "atmn";

export const messages = feature({
  id: "messages",
  name: "AI Messages",
  type: "single_use",
});

export const priorityResponse = feature({
  id: "priority_response",
  name: "Priority Response",
  type: "boolean",
});

export const advancedFlashcards = feature({
  id: "advanced_flashcards",
  name: "Advanced Flashcards",
  type: "boolean",
});

export const pdfUpload = feature({
  id: "pdf_upload",
  name: "PDF Upload",
  type: "boolean",
});

export const crossSessionMemory = feature({
  id: "cross_session_memory",
  name: "Cross-Session Memory",
  type: "boolean",
});

export const deepThinkingMode = feature({
  id: "deep_thinking_mode",
  name: "Deep Thinking Mode",
  type: "boolean",
});

export const interviewPrep = feature({
  id: "interview_prep",
  name: "Interview Prep",
  type: "boolean",
});

export const prioritySupport = feature({
  id: "priority_support",
  name: "Priority Support",
  type: "boolean",
});

export const advancedAnalytics = feature({
  id: "advanced_analytics",
  name: "Advanced Analytics",
  type: "boolean",
});

export const studentStarter = product({
  id: "student_starter",
  name: "Student Starter",
  is_default: true,
  items: [
    featureItem({
      feature_id: messages.id,
      included_usage: 50,
      interval: "month",
    }),
  ],
});

export const studyPro = product({
  id: "study_pro",
  name: "Study Pro",
  items: [
    priceItem({
      price: 9.99,
      interval: "month",
    }),
    featureItem({
      feature_id: messages.id,
      included_usage: 500,
      interval: "month",
    }),
    featureItem({
      feature_id: priorityResponse.id,
    }),
    featureItem({
      feature_id: advancedFlashcards.id,
    }),
    featureItem({
      feature_id: pdfUpload.id,
    }),
    featureItem({
      feature_id: crossSessionMemory.id,
    }),
  ],
});

export const studyElite = product({
  id: "study_elite",
  name: "Study Elite",
  items: [
    priceItem({
      price: 19.99,
      interval: "month",
    }),
    featureItem({
      feature_id: priorityResponse.id,
    }),
    featureItem({
      feature_id: advancedFlashcards.id,
    }),
    featureItem({
      feature_id: pdfUpload.id,
    }),
    featureItem({
      feature_id: crossSessionMemory.id,
    }),
    featureItem({
      feature_id: deepThinkingMode.id,
    }),
    featureItem({
      feature_id: interviewPrep.id,
    }),
    featureItem({
      feature_id: prioritySupport.id,
    }),
    featureItem({
      feature_id: advancedAnalytics.id,
    }),
  ],
});