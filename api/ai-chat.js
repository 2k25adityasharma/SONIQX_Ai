export default async function handler(req, res) {
  // 1. Set Universal CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Preflight check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // Safe Body Parsing
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const prompt = body.question || body.prompt || body.message || '';

    if (!prompt) {
      return res.status(200).json({ 
        success: true, 
        answer: 'Please enter a valid question.' 
      });
    }

    // Retrieve API Key
    const apiKey = 
      process.env.GEMINI_API_KEY || 
      process.env.AI_API_KEY || 
      process.env.VITE_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ 
        success: true, 
        answer: 'Server Error: API Key is missing in Vercel Environment Variables.' 
      });
    }

    // Direct REST Endpoint for Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
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
      return res.status(200).json({ 
        success: true, 
        answer: `Gemini API Error: ${data.error.message || 'Invalid API Key or Model Name'}` 
      });
    }

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({
      success: true,
      answer: aiText || 'No response generated from AI.'
    });

  } catch (error) {
    // Return error message in JSON payload to avoid HTTP 500 crash
    return res.status(200).json({ 
      success: false, 
      answer: `Server Exception: ${error.message}` 
    });
  }
}
