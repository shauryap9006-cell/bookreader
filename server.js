/* eslint-env node */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post('/api/explain', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Explain the following text in plain language using no more than 3 sentences. Do not add extra context or information not related to the text itself.',
        },
        { role: 'user', content: text },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const explanation = completion.choices[0].message.content.trim();
    res.json({ explanation });
  } catch (error) {
    console.error('Error in /api/explain:', error);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

app.post('/api/summarize', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert summarizer. Read the following text and provide a comprehensive, high-quality summary. Extract the primary topic, key arguments, and essential details. Format your response strictly as a list of distinct bullet points. Start each point with a dash. Do not include any headers, conversational filler, or introductory/concluding remarks.',
        },
        { role: 'user', content: text },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const summary = completion.choices[0].message.content.trim();
    // Ensure we parse it to a nice array if the prompt gives raw text.
    // We will just return the raw string and let frontend handle it or parse here.
    // It's cleaner to return an array of strings.
    const bulletPoints = summary
      .split('\n')
      .map((line) => line.trim().replace(/^[-*•]\s*/, ''))
      .filter((line) => line.length > 0);

    res.json({ bulletPoints });
  } catch (error) {
    console.error('Error in /api/summarize:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
