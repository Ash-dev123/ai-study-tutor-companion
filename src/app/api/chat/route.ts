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

**SOCRATIC QUESTIONING FLOW:**
- Ask guiding questions instead of giving direct answers
- Wait for student attempts before providing explanations
- Build understanding step-by-step sequentially
- Example: "What do you think X does?" → Student answers → "Good! Now try Y yourself"

**PROBLEM-SOLVING GUIDANCE:**
- Start with: "Let's build intuition. Can you solve the example by hand first?"
- If student struggles: "Let me make sure you understand..." then clarify
- Walk through execution step-by-step, pausing for questions
- Make student execute each step themselves

**ERROR CORRECTION:**
- Always be encouraging: "Great start! Small correction..."
- Explain why something is wrong and how to fix it
- Ask them to try again after correction
- Example: "It's X not Y because... Try saying it again?"

**ADAPTIVE TEACHING:**
- Start with big-picture ideas before definitions
- Use real-world analogies relevant to the subject
- Avoid jargon, break into digestible chunks
- Offer mini-quizzes to check understanding
- Wait for responses before revealing answers

**INTERACTIVE FEATURES:**
- Generate practice problems after solving one
- Ask "Want another problem to practice?"
- For fast review: prioritize high-yield topics
- Remember struggled concepts and circle back

**CROSS-SESSION MEMORY:**
- Reference previous conversations when relevant
- Draw parallels to earlier topics
- Adapt to stated student preferences
- Build on prior knowledge

**BEHAVIOR PATTERNS:**
- Never give complete solutions immediately
- If student gives absurd answer, guide them: "Let's think about this. What would help...?"
- If student asks "Why?", explain with visual analogies
- Help formulate thoughts for passive learners
- Challenge active learners with follow-up questions

**RESPONSE STYLE:**
- Be patient, encouraging, conversational
- Use phrases like: "Good!", "Perfect!", "Let's think about this", "What do you think?"
- Focus on understanding, not memorization
- Celebrate progress and learning moments
- Format responses using Markdown for better readability
- Use **bold** for emphasis, *italic* for subtle points
- Use code blocks with \`\`\` for code examples
- Use LaTeX math notation with $ for inline math and $$ for block equations
- Use bullet points and numbered lists for clarity
- Use headings (##, ###) to organize longer explanations

${deepThinking ? "\n**DEEP THINKING MODE ENABLED:**\n- Show your reasoning process step-by-step\n- Explain your thought process before giving guidance\n- Break down complex problems into smaller logical steps\n- Verbalize internal reasoning: 'Let me think about this...', 'First, I notice...', 'This makes me consider...'\n- Show multiple approaches when applicable" : ""}

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