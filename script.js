document.addEventListener('DOMContentLoaded', function() {
    const partSelector = document.getElementById('part-selector');
    const generateButton = document.getElementById('generate-button');
    const questionContainer = document.getElementById('question');

    generateButton.addEventListener('click', function() {
        const selectedPart = partSelector.value;

        fetch('YOUR_API_GATEWAY_URL/generate_question', { // 將 YOUR_API_GATEWAY_URL 替換為你的實際 URL
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ part: selectedPart })
})
// ... 後續的 .then 和 .catch 部分保持不變
        .then(response => response.json())
        .then(data => {
            if (data.question) {
                const lines = data.question.split('\n');
                let formattedQuestion = '';
                for (const line of lines) {
                    if (line.startsWith('**')) {
                        formattedQuestion += `<h3>${line.substring(2, line.length - 2)}</h3>`;
                    } else if (line.trim() !== '') {
                        formattedQuestion += `<p>${line}</p>`;
                    }
                }
                questionContainer.innerHTML = formattedQuestion;
            } else if (data.error) {
                questionContainer.textContent = `錯誤：${data.error}`;
            } else {
                questionContainer.textContent = '無法生成題目，請稍後再試。';
            }
        })
        .catch(error => {
            console.error('請求錯誤:', error);
            questionContainer.textContent = '與伺服器通訊發生錯誤。';
        });
    });
});