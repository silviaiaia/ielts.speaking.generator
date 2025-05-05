app.post('/api/generate_question', async (req, res) => {
    try {
        const { part } = req.body;

        if (!part || !['part1', 'part2', 'part3'].includes(part)) {
            return res.status(400).json({ error: '無效的題型選擇' });
        }

        // 根據選擇的部分生成適當的提示
        let prompt = '';

        if (part === 'part1') {
            prompt = `生成一組雅思口說考試 Part 1 的問題。要求：...`;
        } else if (part === 'part2') {
            prompt = `生成一個雅思口說考試 Part 2 的 Cue Card 題目。要求：...`;
        } else { // part3
            prompt = `生成一組雅思口說考試 Part 3 的深入討論問題。要求：...`;
        }

        // 調用 Gemini API
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = googleAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ question: text });
    } catch (error) {
        console.error('Gemini API 錯誤:', error);
        res.status(500).json({ error: '生成問題時出錯，請稍後再試' });
    }
});
