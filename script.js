document.addEventListener('DOMContentLoaded', function() {
    const partSelector = document.getElementById('part-selector');
    const generateButton = document.getElementById('generate-button');
    const questionContainer = document.getElementById('question');
    
    // 將此處的 URL 更改為您的 Vercel 部署 URL
    const API_URL = 'https://ielts-speaking-generator.vercel.app/api/generate_question';
    
    generateButton.addEventListener('click', function() {
        // 顯示載入中提示
        questionContainer.innerHTML = '<p class="loading">載入中，請稍候...</p>';
        
        const selectedPart = partSelector.value;
        
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ part: selectedPart })
        })
        .then(response => {
            // 添加錯誤檢查
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.question) {
                const lines = data.question.split('\n');
                let formattedQuestion = '';
                for (const line of lines) {
                    if (line.startsWith('**') && line.endsWith('**')) {
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
            questionContainer.textContent = '與伺服器通訊發生錯誤：' + error.message;
        });
    });
});
