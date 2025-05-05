const express = require('express');
const app = express();

const cors = require('cors');
require('dotenv').config();

// ... 其他中間件和路由定義
app.post('/api/generate_question', async (req, res) => {
    try {
        const { part } = req.body;
        // ... (生成 prompt 的程式碼)

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = googleAI.getGenerativeModel({ model: "gemini-pro" });

        // 設置超時時間 (例如 20 秒)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API request timed out')), 20000)
        );

        const resultPromise = model.generateContent(prompt);

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ question: text });

    } catch (error) {
        console.error('生成問題時出錯:', error);
        res.status(500).json({ error: '生成問題時出錯，請稍後再試' + (error.message ? ': ' + error.message : '') });
    }
});
