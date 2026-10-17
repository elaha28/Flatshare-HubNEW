import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { text } = await req.json();
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_flash_v2_5', // Cheapest & fastest model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });

    if (!response.ok) {
      throw new Error('ElevenLabs API failed');
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

  } catch (error) {
    console.error('ElevenLabs Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}