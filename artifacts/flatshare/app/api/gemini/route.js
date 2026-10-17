import { NextResponse } from 'next/server';

export async function POST(req) {
  const startTime = Date.now();
  
  try {
    const { text, language } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `You are a helpful assistant for university students. Read the following document.
    1. Provide a short, bulleted summary of the key actionable information written entirely in the ${language} language. Put this in the "summary" key.
    2. Translate the FULL document into ${language}. Put this in the "translation" key.
       3. If the document contains a financial bill, extract it to the "extractedBill" key: {"name": "Title", "amount": 100.00, "dueDate": "YYYY-MM-DD"}. If a year is not explicitly stated in the document, assume the year is 2026. Otherwise, return null.

    Document Text: ${text}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey 
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite",
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json"
        },
        generation_config: {
          thinking_level: "low",
          max_output_tokens: 1024 
        }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("🚨 GOOGLE API ERROR:", data.error.message);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    let modelText = "";
    if (data.steps && Array.isArray(data.steps)) {
      for (const step of data.steps) {
        if (step.content && Array.isArray(step.content)) {
          for (const block of step.content) {
            if (block.text) {
              modelText = block.text;
              break;
            }
          }
        }
      }
    }

    if (!modelText) {
        console.error("Could not find text in response:", JSON.stringify(data, null, 2));
        return NextResponse.json({ error: 'Gemini response did not contain text.' }, { status: 500 });
    }

    const cleanJson = modelText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Gemini analyzed the document in ${timeTaken} seconds!`);

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}