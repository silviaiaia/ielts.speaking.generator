const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 健康檢查端點
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// 直接處理 generate_question 路由
app.post('/api/generate_question', async (req, res) => {
    try {
        const { part } = req.body;

        if (!part || !['part1', 'part2', 'part3'].includes(part)) {
            return res.status(400).json({ error: '無效的題型選擇' });
        }

        // 根據選擇的部分生成適當的提示
        let prompt = '';

        if (part === 'part1') {
            prompt = `Generate a set of IELTS Speaking Part 1 questions. Include 1 main question and 2–3 follow-up questions. All in English. 要求：...`;
        } else if (part === 'part2') {
            prompt = `Generate one IELTS Speaking Part 2 task card with a topic and bullet point prompts. Then add 2–3 follow-up questions that an examiner might ask after the candidate's response. 要求：...`;
        } else { // part3
            prompt = `Generate a set of IELTS Speaking Part 3 questions. Start with a main discussion question and add 2–3 related follow-up questions. All in English. 要求：...`;
        }

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt); // 這裡使用了 prompt 變數
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ question: text });
    } catch (error) {
        console.error('生成問題時出錯:', error);
        res.status(500).json({ error: '生成問題時出錯，請稍後再試' + (error.message ? ': ' + error.message : '') });
    }
});

// 通配符路由 - 捕獲所有其他 API 請求
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: '找不到此 API 端點', path: req.path });
});

// 只在本地開發時啟動服務器 (可以保留，Vercel 不會執行這部分)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// 導出 app 實例
module.exports = app;
