import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

async function testApiKey() {
  try {
    const response = await openai.chat.completions.create({
      model: "groq/compound", // Update to the requested model
      messages: [{ role: "user", content: "Say 'Success' if you can read this." }],
      max_tokens: 10,
    });
    console.log("✅ Groq API Key is working correctly!");
    console.log("Response:", response.choices[0].message.content.trim());
  } catch (error) {
    console.error("❌ API Key check failed.");
    console.error("Error message:", error.message);
    if (error.status === 401) {
      console.error("Cause: Invalid API Key (Unauthorized)");
    } else if (error.status === 429) {
        console.error("Cause: Rate limit exceeded or insufficient credits.");
    }
  }
}

testApiKey();
