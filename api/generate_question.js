app.post('/api/generate_question', async (req, res) => {
    console.log('接收到的 req.body:', req.body);
    try {
        res.status(200).json({ message: '測試響應' });
    } catch (error) {
        console.error('測試錯誤:', error);
        res.status(500).json({ error: '測試錯誤' });
    }
});
