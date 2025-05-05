document.addEventListener('DOMContentLoaded', function() {
    const partSelector = document.getElementById('part-selector');
    const generateButton = document.getElementById('generate-button');
    const questionContainer = document.getElementById('question-container'); // 修改了選擇器

    const API_URL = '/api/generate_question'; // 使用相對 URL

    generateButton.addEventListener('click', function() {
        // 顯示載入中提示
        questionContainer.innerHTML = '<p class="loading">載入中，請稍候...</p>';

        const selectedPart = partSelector.value;

        console.log('發送請求到:', API_URL);
        console.log('請求數據:', JSON.stringify({ part: selectedPart }));

        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ part: selectedPart })
        })
        .then(response => {
            console.log('收到回應狀態:', response.status);
            // 添加錯誤檢查
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('錯誤響應內容:', text);
                    throw new Error(`HTTP error! Status: ${response.status}, Body: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('收到數據:', data);
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
                questionContainer.innerHTML = formattedQuestion; // 使用 innerHTML 更新外層 div
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
