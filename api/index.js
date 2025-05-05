// 【api/index.js】- 主要的 Express 服務器入口點
const express = require('express');
const cors = require('cors');
const generateQuestionRoute = require('./generate_question');
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

// 引入題目生成路由
app.use('/api', generateQuestionRoute);

// 只在本地開發時啟動服務器
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
