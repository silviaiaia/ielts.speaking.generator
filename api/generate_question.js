// api/generate_question.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Vercel Edge Function 設置，使用Node.js v18 運行環境
export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  // 只接受POST請求
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // 允許跨域請求
        },
      }
    );
  }

  try {
    // 解析請求內容
    const { part } = await req.json();

    // 驗證必要參數
    if (!part) {
      return new Response(
        JSON.stringify({ error: "Part parameter is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // 使用環境變數中的API金鑰
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // 根據選擇的part構建提示詞
    let prompt = "";
    
    switch(part) {
      case "part1":
        prompt = "Generate an IELTS Speaking Part 1 question with 3-4 follow-up questions about a common topic like hobbies, work, hometown, etc. Format the response with '**Topic**' as heading followed by numbered questions.";
        break;
      case "part2":
        prompt = "Generate an IELTS Speaking Part 2 cue card topic. Format the response with '**Cue Card**' as heading, followed by the topic, and include bullet points with 'Describe', 'Explain', 'Say' etc.";
        break;
      case "part3":
        prompt = "Generate 4-5 IELTS Speaking Part 3 discussion questions related to a specific theme. Format the response with '**Discussion Topic**' as heading followed by numbered questions that require analysis and opinion.";
        break;
      default:
        prompt = "Generate an IELTS Speaking question.";
    }

    // 初始化Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 發送請求到Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 返回結果
    return new Response(
      JSON.stringify({ question: text }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
