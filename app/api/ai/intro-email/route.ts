import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Helper to simulate stream if ANTHROPIC_API_KEY is not set
function simulateStream(text: string) {
  const encoder = new TextEncoder();
  const words = text.split(' ');
  let index = 0;

  return new ReadableStream({
    async start(controller) {
      function sendNextWord() {
        if (index < words.length) {
          const chunk = words[index] + (index === words.length - 1 ? '' : ' ');
          controller.enqueue(encoder.encode(chunk));
          index++;
          setTimeout(sendNextWord, 50); // Stream word-by-word with delay
        } else {
          controller.close();
        }
      }
      sendNextWord();
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchmaker, client, candidate } = body;

    if (!client || !candidate) {
      return new Response(JSON.stringify({ error: 'Missing client or candidate profiles' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const matchmakerName = matchmaker?.name || 'Admin Matchmaker';
    const clientName = `${client.firstName} ${client.lastName}`;
    const candidateName = `${candidate.firstName} ${candidate.lastName}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Simulated Fallback Stream if API Key is not set
    if (!apiKey) {
      const fallbackText = `Subject: Connecting you with a wonderful match - ${candidate.firstName} ${candidate.lastName}

Dear ${client.firstName},

I hope this email finds you well. I am writing to introduce you to a highly compatible match from our database - ${candidateName}, who works as a ${candidate.designation} based in ${candidate.city}. 

In reviewing both of your details, I noticed that you both share a ${candidate.diet} diet preference, appreciate ${candidate.familyType} family values, and have very similar career ambitions. I believe you two would have a wonderful connection and suggest scheduling a quick introductory phone call to get acquainted.

Please let me know if you would like me to share your profile with her and set this up.

Warm regards,
${matchmakerName}
Matrimonial consultant, The Divine Connection`;

      return new Response(simulateStream(fallbackText), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        }
      });
    }

    // Call Anthropic API with Streaming
    const prompt = `Matchmaker Name: ${matchmakerName}
Client Details:
Name: ${clientName}
Gender: ${client.gender}
Age: ${client.age}
City: ${client.city}
Education: ${client.undergraduateCollege}
Designation: ${client.designation} at ${client.currentCompany}
Religion: ${client.religion}

Candidate Details:
Name: ${candidateName}
Gender: ${candidate.gender}
Age: ${candidate.age}
City: ${candidate.city}
Education: ${candidate.undergraduateCollege}
Designation: ${candidate.designation} at ${candidate.currentCompany}
Religion: ${candidate.religion}
Diet: ${candidate.diet}
Family: ${candidate.familyType}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: "You are a professional Indian matrimonial matchmaker writing a warm, polite email introducing a potential match (the candidate) to your client. Explain why they are a good match, suggest a next step (like a phone call or meeting), and sign off with your name and 'Matrimonial Consultant, The Divine Connection'. Keep the tone warm, professional, and culturally sensitive.",
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Anthropic rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Anthropic API Error: ${errorText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  controller.enqueue(new TextEncoder().encode(data.delta.text));
                }
              } catch {
                // Ignore incomplete JSONs or heartbeats
              }
            }
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Server error occurred';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
