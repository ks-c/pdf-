import { AISettings, Paper } from '../types';

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  settings: AISettings
): Promise<any> {
  if (!settings.url || !settings.key || !settings.model) {
    throw new Error("AI settings are not configured. Please set URL, Key, and Model.");
  }

  // Normalize URL to prevent 404 errors by ensuring it points to the correct endpoint.
  let endpointUrl = settings.url.trim();
  if (endpointUrl.endsWith('/')) {
    endpointUrl = endpointUrl.slice(0, -1);
  }
  if (!endpointUrl.endsWith('/chat/completions')) {
    endpointUrl = `${endpointUrl}/chat/completions`;
  }


  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.key}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function extractInfoFromText(text: string, settings: AISettings): Promise<Partial<Paper>> {
  const systemPrompt = `You are an expert academic assistant. Your task is to extract metadata from the provided text of a research paper. Respond ONLY with a valid JSON object with the following keys: "title" (string), "authors" (array of strings), "abstract" (string), "doi" (string), "journal" (string), "date" (string). If a field cannot be found, return an empty string or array for it.`;
  const userPrompt = `Here is the text from a research paper. Please extract the required metadata:\n\n---\n\n${text.substring(0, 8000)}`;

  const responseText = await callOpenAI(systemPrompt, userPrompt, settings);
  try {
    // Sometimes the model wraps the JSON in markdown backticks
    const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedResponse);
  } catch (e) {
    console.error("Failed to parse JSON from AI response:", responseText);
    throw new Error("AI returned malformed data for paper metadata.");
  }
}

export async function translatePaper(paper: Paper, settings: AISettings): Promise<{ translatedTitle: string; translatedAbstract: string; }> {
  const systemPrompt = `You are a professional academic translator. Translate the given title and abstract into Chinese. Respond ONLY with a valid JSON object with keys: "translatedTitle" and "translatedAbstract".`;
  const userPrompt = `Title: "${paper.title}"\n\nAbstract: "${paper.abstract}"`;

  const responseText = await callOpenAI(systemPrompt, userPrompt, settings);
  try {
    const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedResponse);
  } catch (e) {
    console.error("Failed to parse JSON from AI translation response:", responseText);
    throw new Error("AI returned malformed data for translation.");
  }
}

export async function summarizePapers(papers: Paper[], settings: AISettings): Promise<string> {
    const systemPrompt = `You are a research analyst. Based on the provided titles and abstracts, write a comprehensive and insightful review. Synthesize the key findings, methodologies, and conclusions. Structure your review logically and highlight any connections or contradictions between the papers.`;
    
    const papersContent = papers.map((p, i) => 
        `Paper ${i + 1}:\nTitle: ${p.title}\nAuthors: ${p.authors.join(', ')}\nAbstract: ${p.abstract}`
    ).join('\n\n---\n\n');
    
    const userPrompt = `Please provide a summary and review of the following papers:\n\n${papersContent}`;

    return callOpenAI(systemPrompt, userPrompt, settings);
}