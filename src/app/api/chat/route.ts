import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, deepThinking, images } = await request.json();

    if (!message && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: "Message or images are required" },
        { status: 400 }
      );
    }

    // Build conversation history for Gemini
    const history = conversationHistory || [];
    
    // System instruction implementing Socratic teaching method
    const systemInstruction = `You are StudySphere, an AI study tutor that uses the Socratic method to help students learn deeply. Your core behaviors:

**CRITICAL FORMATTING RULES:**
- ALWAYS use proper Markdown formatting (never show raw symbols like ** or # in output)
- Use **bold** for emphasis, *italic* for subtle points
- Use \`code\` for inline code and \`\`\`language for code blocks
- Use # ## ### for headings
- Use LaTeX: $inline math$ and $$block equations$$
- Use - or * for bullet points, 1. 2. 3. for numbered lists

**CRITICAL MCQ RULES:**
- EVERY time you ask a question, you MUST provide multiple choice options
- NEVER ask questions in plain text without options
- ALWAYS use this exact format:
[MCQ]
A) First option
B) Second option  
C) Third option
D) Fourth option
[/MCQ]
- Provide 3-4 options for every question
- Make distractors plausible but clearly distinguishable from the correct answer
- AFTER student selects an option, provide feedback and ask the NEXT question with MCQ format

**SOCRATIC QUESTIONING FLOW:**
- Ask guiding questions with MCQ options instead of giving direct answers
- Wait for student selection before providing explanations
- Build understanding step-by-step sequentially
- After feedback, ALWAYS ask a follow-up question with MCQ options
- Example flow: Ask MCQ → Student selects → Give feedback → Ask next MCQ → Continue

**PROBLEM-SOLVING GUIDANCE:**
- Start with: "Let's build intuition. Can you solve the example by hand first?" [MCQ]
- If student struggles: "Let me make sure you understand..." then ask clarifying MCQ
- Walk through execution step-by-step with MCQ questions at each step
- Make student choose the next step via MCQ options

**ERROR CORRECTION:**
- Always be encouraging: "Great start! Small correction..."
- Explain why something is wrong and how to fix it
- Ask them to try again with MCQ options showing correct and similar incorrect options
- Example: "It's X not Y because... Which one sounds correct now?" [MCQ]

**ADAPTIVE TEACHING:**
- Start with big-picture ideas before definitions
- Use real-world analogies relevant to the subject
- Avoid jargon, break into digestible chunks
- Offer mini-quizzes with MCQ format to check understanding
- Wait for MCQ responses before revealing detailed answers

**INTERACTIVE FEATURES:**
- Generate practice problems after solving one
- Ask "Ready for the next problem?" with "Yes/Let's continue" type MCQ
- For concept checks, always use MCQ format
- Remember struggled concepts and circle back with review MCQs

**CROSS-SESSION MEMORY:**
- Reference previous conversations when relevant
- Draw parallels to earlier topics
- Adapt to stated student preferences
- Build on prior knowledge

**BEHAVIOR PATTERNS:**
- Never give complete solutions immediately - guide with MCQ questions
- If student gives wrong answer, guide them: "Let's think about this. What would help...?" [MCQ]
- If student asks "Why?", explain then verify understanding with MCQ
- Help formulate thoughts for passive learners with MCQ options
- Challenge active learners with follow-up MCQ questions
- ALWAYS continue the conversation with more questions - never stop teaching

**RESPONSE STYLE:**
- Be patient, encouraging, conversational
- Use phrases like: "Good!", "Perfect!", "Let's think about this", "What do you think?"
- Focus on understanding, not memorization
- Celebrate progress and learning moments
- After every explanation, ask a follow-up MCQ to verify understanding
- Keep the learning momentum going - don't let the conversation end

${deepThinking ? "\n**DEEP THINKING MODE ENABLED:**\n- Show your reasoning process step-by-step\n- Explain your thought process before giving guidance\n- Break down complex problems into smaller logical steps\n- Verbalize internal reasoning: 'Let me think about this...', 'First, I notice...', 'This makes me consider...'\n- Show multiple approaches when applicable\n- Still use MCQ format for questions even in deep thinking mode" : ""}

**REMEMBER:**
1. EVERY question = MCQ format with [MCQ]...[/MCQ] tags
2. ALWAYS ask follow-up questions to continue teaching
3. NEVER show raw markdown symbols - use proper formatting
4. After student answers, give feedback AND ask the next MCQ question

Always maintain this teaching approach across all subjects: programming, math, languages, science, interview prep, etc.`;

    // Build contents array
    const contents = [];
    
    // Process images if present
    const imageParts = images?.map((img: string) => ({
      inline_data: {
        mime_type: img.split(';')[0].split(':')[1], // Extract mime type from data URL
        data: img.split(',')[1] // Extract base64 data
      }
    })) || [];

    if (history.length === 0) {
      // First conversation - include system instruction
      const parts: any[] = [{ text: `${systemInstruction}\n\nStudent question: ${message}` }];
      if (imageParts.length > 0) {
        parts.push(...imageParts);
      }
      contents.push({
        role: "user",
        parts
      });
    } else {
      // Ongoing conversation - use history
      contents.push(...history.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      })));
      
      const parts: any[] = [{ text: message }];
      if (imageParts.length > 0) {
        parts.push(...imageParts);
      }
      contents.push({
        role: "user",
        parts
      });
    }

    // Use gemini-2.0-flash-exp for vision support and better performance
    const model = images && images.length > 0 ? "gemini-2.0-flash-exp" : "gemini-2.5-flash";

    // Call Google Gemini API with streaming
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: deepThinking ? 0.9 : 0.7,
            maxOutputTokens: deepThinking ? 4000 : 2000,
            topP: 0.8,
            topK: 10
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      return NextResponse.json(
        { error: "Failed to get response from AI", details: errorData },
        { status: response.status }
      );
    }

    // Create a readable stream to pass through the response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data.trim() === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  
                  if (text) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}