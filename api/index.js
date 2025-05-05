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
    // ... 你的生成問題邏輯
});

// 通配符路由 - 捕獲所有其他 API 請求
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: '找不到此 API 端點', path: req.path });
});

// ... (其他程式碼)

module.exports = app;
