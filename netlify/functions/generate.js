exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { format, product } = body;
  if (!format || !product) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing format or product' }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  const formatInstructions = {
    'Facebook Ad': `Write a high-converting Facebook Ad with:
- A punchy, curiosity-driven hook (1-2 lines)
- The core benefit and social proof
- Specific outcome the customer gets
- Strong CTA with urgency
Keep it 100-150 words. No hashtags. Use short paragraphs.`,

    'Email Subject Lines': `Write 5 high-converting email subject lines for this product.
Format as a numbered list. Each line should use a different psychological trigger:
1. Curiosity gap
2. Specific benefit
3. Social proof / FOMO
4. Problem/pain agitation
5. Direct value offer
Keep each under 50 characters where possible.`,

    'Landing Page Hero Section': `Write a landing page hero section with:
- Headline (max 10 words, lead with strongest transformation)
- Subheadline (1-2 sentences expanding on the promise)
- 3 bullet proof points (benefit, not feature)
- Primary CTA button text
- Social proof line (e.g. "Join X people already...")
Format clearly with labels.`,

    'Google Ad': `Write a Google Search Ad with:
Headline 1 (30 chars max)
Headline 2 (30 chars max)  
Headline 3 (30 chars max)
Description 1 (90 chars max)
Description 2 (90 chars max)
Include the strongest keyword naturally. Focus on immediate benefit.`,

    'Instagram Caption': `Write an Instagram caption that:
- Opens with a strong first line (no "I" at start)
- Tells a micro-story or shares insight
- Includes a soft call to action
- Ends with 5-8 relevant hashtags
Length: 100-200 words.`,

    'Cold Email Opening': `Write the opening 3 paragraphs of a cold outreach email that:
- Opens with a personalized or pattern-interrupt first line (no "I saw your profile")
- Identifies a specific pain point they likely have
- Teases the solution without overselling
- Ends with a low-friction CTA question
Keep it under 100 words total. No fluff.`,

    'Product Description': `Write a product description that:
- Leads with the transformation/outcome (not features)
- Uses sensory and emotional language
- Includes 3-5 bullet benefit points
- Addresses the main objection
- Ends with a compelling reason to buy now
Length: 150-200 words.`
  };

  const instruction = formatInstructions[format] || `Write high-converting ${format} copy for the product described.`;

  const prompt = `You are an elite direct-response copywriter with 20+ years of experience writing copy that has generated hundreds of millions in sales. You write in a punchy, direct, human voice that connects emotionally and compels action.

Product/Service: ${product}

Task: ${instruction}

Write ONLY the copy. No meta-commentary, no "here is your copy", no explanations. Just the finished copy ready to publish.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', errText);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI generation failed', detail: errText }) };
    }

    const data = await response.json();
    const copy = data.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ copy })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal error', detail: err.message })
    };
  }
};
