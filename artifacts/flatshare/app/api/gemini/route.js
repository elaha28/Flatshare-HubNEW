import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { text, language } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `You are a helpful assistant for university students. Read the following document.
    1. Provide a plain English summary of the key points (keep it to 1-2 short sentences).
    2. Translate the FULL document into ${language}.
    Format your response as a valid JSON object with exactly two keys: "summary" and "translation". Do not wrap it in markdown blockquotes.

    Document Text: ${text}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey 
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json"
        }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("🚨 GOOGLE API ERROR:", data.error.message);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    // SMART EXTRACTION: Search all steps to find the text block
    let modelText = "";
    if (data.steps && Array.isArray(data.steps)) {
      for (const step of data.steps) {
        if (step.content && Array.isArray(step.content)) {
          for (const block of step.content) {
            if (block.text) {
              modelText = block.text;
              break; // Found the text, stop searching
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

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}