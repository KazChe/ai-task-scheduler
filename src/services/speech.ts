import OpenAI from 'openai';

let openai: OpenAI;

function getClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/x-m4a': 'm4a',
  'audio/webm;codecs=opus': 'webm',
};

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const ext = MIME_TO_EXT[mimeType] || 'webm';
  const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

  const result = await getClient().audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });

  return result.text;
}
