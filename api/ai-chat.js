export default async function handler(req, res) {
  // 1. Set CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const prompt = body.question || body.prompt || '';

    if (!prompt) {
      return res.status(400).json({ answer: 'Please enter a valid question.' });
    }

    // 2. Fetch Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ 
        answer: 'API Key missing on server! Please check Vercel Environment Variables.' 
      });
    }

    // 3. Direct Gemini REST Call
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are Dr. Audio AI for SONIQX. Answer this question concisely about hearing health or audiology: ${prompt}`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ answer: `Gemini API Error: ${data.error.message}` });
    }

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({
      success: true,
      answer: aiText || 'No response generated from AI.'
    });

  } catch (error) {
    return res.status(500).json({ answer: `Server Error: ${error.message}` });
  }
}
