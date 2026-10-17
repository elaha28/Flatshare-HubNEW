import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { text } = await req.json();
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    // Using "Will" - the most reliable default voice ID
    const voiceId = 'bIHbv24MWmeRgasZH58o'; 

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2', // Switched to standard model for reliability
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("🚨 ELEVENLABS API ERROR:", errorData);
      return NextResponse.json({ error: 'ElevenLabs failed' }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

  } catch (error) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}