const express = require('express');
const cors = require('cors');
const generateQuestionRouter = require('./generate_question');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 允許來自任何來源的請求 (在生產環境中可以改為特定域名)
app.use(cors({
  origin: '*',  // 或者替換為您 GitHub Pages 的網址
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
    // 引入 generate_question.js 中的邏輯
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const { part } = req.body;
    
    if (!part || !['part1', 'part2', 'part3'].includes(part)) {
      return res.status(400).json({ error: '無效的題型選擇' });
    }
    
    // 根據選擇的部分生成適當的提示
    let prompt = '';
    
    if (part === 'part1') {
      prompt = `生成一組雅思口說考試 Part 1 的問題。要求：
1. 主題要符合雅思常見話題，如：工作、學習、家鄉、興趣愛好等
2. 生成5-7個相關問題
3. 問題應從簡單到稍微複雜
4. 輸出格式：以"**[主題名稱]**"為標題，然後列出問題`;
    } else if (part === 'part2') {
      prompt = `生成一個雅思口說考試 Part 2 的 Cue Card 題目。要求：
1. 按照標準雅思 Part 2 格式，包含"Describe..."的主要提示
2. 包含3-4個引導性子問題
3. 題目要貼近真實考試，符合雅思常見話題
4. 輸出格式：以"**Cue Card**"為標題，然後是完整的 Part 2 卡片內容`;
    } else { // part3
      prompt = `生成一組雅思口說考試 Part 3 的深入討論問題。要求：
1. 假設該問題延續了一個 Part 2 的話題
2. 生成5-7個更具挑戰性、需要批判性思考的問題
3. 問題應探討社會趨勢、比較、個人意見或預測等
4. 輸出格式：以"**深入討論：[相關主題]**"為標題，然後列出問題`;
    }
    
    // 調用 Gemini API
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

// 引入題目生成路由 (作為備用)
// app.use('/api', generateQuestionRouter);

// 通配符路由 - 捕獲所有其他 API 請求
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: '找不到此 API 端點', path: req.path });
});

// 只在本地開發時啟動服務器
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
