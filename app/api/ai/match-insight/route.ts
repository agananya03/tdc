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
    const { client, candidate } = body;

    if (!client || !candidate) {
      return new Response(JSON.stringify({ error: 'Missing client or candidate profiles' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const clientName = `${client.firstName} ${client.lastName}`;
    const candidateName = `${candidate.firstName} ${candidate.lastName}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Prompt details for AI
    const prompt = `Client details:
Name: ${clientName}
Gender: ${client.gender}
Age: ${client.age}
City: ${client.city}
Education: ${client.undergraduateCollege} / ${client.postGraduation}
Designation: ${client.designation} at ${client.currentCompany}
Income: INR ${client.income}
Religion/Caste: ${client.religion} / ${client.caste}
Gotra: ${client.gotra}
Diet: ${client.diet}
Smoking/Drinking: ${client.smoking} / ${client.drinking}
Family: ${client.familyType}

Candidate details:
Name: ${candidateName}
Gender: ${candidate.gender}
Age: ${candidate.age}
City: ${candidate.city}
Education: ${candidate.undergraduateCollege} / ${candidate.postGraduation}
Designation: ${candidate.designation} at ${candidate.currentCompany}
Income: INR ${candidate.income}
Religion/Caste: ${candidate.religion} / ${candidate.caste}
Gotra: ${candidate.gotra}
Diet: ${candidate.diet}
Smoking/Drinking: ${candidate.smoking} / ${candidate.drinking}
Family: ${candidate.familyType}`;

    // 1. If OPENAI_API_KEY is present, call OpenAI API with Streaming
    if (openaiKey) {
      const systemInstruction = "You are a professional Indian matrimonial matchmaker. Analyze compatibility between two profiles and provide a warm, insightful 3-sentence explanation covering: what makes them compatible, one potential area to discuss, and an encouraging closing note. Be culturally sensitive and use a professional tone.";

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `OpenAI API Error: ${errorText}` }), {
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
                  const chunkText = data.choices?.[0]?.delta?.content;
                  if (chunkText) {
                    controller.enqueue(new TextEncoder().encode(chunkText));
                  }
                } catch {
                  // Ignore parse errors or heartbeats
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
          'X-AI-Provider': 'OpenAI'
        }
      });
    }

    // 2. If GEMINI_API_KEY is present, call Gemini API with Streaming
    if (geminiKey) {
      const systemInstruction = "You are a professional Indian matrimonial matchmaker. Analyze compatibility between two profiles and provide a warm, insightful 3-sentence explanation covering: what makes them compatible, one potential area to discuss, and an encouraging closing note. Be culturally sensitive and use a professional tone.";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?key=${geminiKey}&alt=sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `Gemini API Error: ${errorText}` }), {
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
                try {
                  const data = JSON.parse(dataStr);
                  const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (chunkText) {
                    controller.enqueue(new TextEncoder().encode(chunkText));
                  }
                } catch {
                  // Ignore parse errors or heartbeats
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
          'X-AI-Provider': 'Gemini'
        }
      });
    }

    // 3. Simulated Fallback Stream if neither key is set
    if (!openaiKey && !geminiKey && !apiKey) {
      const fallbackText = `Based on their profiles, ${clientName} and ${candidateName} show exceptional compatibility. Both are highly educated professionals residing in ${client.city} and ${candidate.city} respectively, sharing similar religious values. We recommend they discuss their lifestyle preferences to ensure complete alignment. They have all the markers of a wonderful connection, and we encourage them to proceed.`;
      return new Response(simulateStream(fallbackText), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'X-AI-Provider': 'Simulated AI'
        }
      });
    }

    // 3. Call Anthropic API with Streaming (if ANTHROPIC_API_KEY is present but GEMINI_API_KEY is not)
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key is not configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: "You are a professional Indian matrimonial matchmaker. Analyze compatibility between two profiles and provide a warm, insightful 3-sentence explanation covering: what makes them compatible, one potential area to discuss, and an encouraging closing note. Be culturally sensitive and use a professional tone.",
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
        'X-AI-Provider': 'Claude'
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
