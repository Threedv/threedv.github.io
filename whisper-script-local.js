// 로컬 백엔드 Whisper Converter - No Xenova, Pure API calls
const BACKEND_URL = 'http://localhost:5000';
let serverOnline = false;

// 페이지 로드 시 서버 상태 확인
document.addEventListener('DOMContentLoaded', function() {
    checkServerStatus();
    setupEventListeners();
});

async function checkServerStatus() {
    try {
        updateServerStatus('🔄 Checking server status...', 'checking');
        
        const response = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'healthy') {
                serverOnline = true;
                const gpuStatus = data.gpu_available ? '🚀 GPU acceleration enabled' : '⚠️ CPU mode (slower)';
                const modelStatus = data.model_loaded ? '✅ Model loaded' : '⏳ Model will load on first use';
                
                updateServerStatus(
                    `✅ Backend server is online<br>${gpuStatus}<br>${modelStatus}`, 
                    'online'
                );
            } else {
                throw new Error('Server unhealthy');
            }
        } else {
            throw new Error(`Server responded with ${response.status}`);
        }
    } catch (error) {
        console.error('Server check failed:', error);
        serverOnline = false;
        updateServerStatus(
            `❌ Backend server is offline<br>Please start the server: <code>python3 whisper_backend.py</code><br>Then refresh this page`, 
            'offline'
        );
    }
}

function updateServerStatus(message, status) {
    const statusDiv = document.getElementById('serverStatus');
    const messageP = document.getElementById('statusMessage');
    
    messageP.innerHTML = message;
    
    // 상태에 따른 스타일 변경
    switch(status) {
        case 'online':
            statusDiv.style.background = '#e8f5e8';
            statusDiv.style.borderColor = '#4caf50';
            messageP.style.color = '#2e7d32';
            break;
        case 'offline':
            statusDiv.style.background = '#ffebee';
            statusDiv.style.borderColor = '#f44336';
            messageP.style.color = '#c62828';
            break;
        case 'checking':
            statusDiv.style.background = '#ffecb3';
            statusDiv.style.borderColor = '#ffc107';
            messageP.style.color = '#ef6c00';
            break;
    }
}

function setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const audioFile = document.getElementById('audioFile');
    
    // File input change handler
    audioFile.addEventListener('change', handleFileSelect);
    
    // Drag and drop handlers
    uploadArea.addEventListener('click', () => audioFile.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

async function processFile(file) {
    // 서버가 온라인인지 확인
    if (!serverOnline) {
        alert('Backend server is not available. Please start the server first:\npython3 whisper_backend.py');
        return;
    }
    
    // 기본 파일 체크
    if (!file) {
        alert('No file selected. Please select a valid audio file.');
        resetConverter();
        return;
    }
    
    // 파일 확장자 검증
    const validExtensions = ['m4a', 'mp3', 'wav', 'flac'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (!validExtensions.includes(fileExtension)) {
        alert('Please select a valid audio file (M4A, MP3, WAV, or FLAC)');
        resetConverter();
        return;
    }
    
    // UI 상태 변경
    document.querySelector('.upload-section').style.display = 'none';
    document.getElementById('processingSection').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';
    
    console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    try {
        updateStatus('Preparing file for upload...');
        updateProgress(10);
        
        // FormData 생성
        const formData = new FormData();
        formData.append('audio', file);
        
        updateStatus('Uploading to backend server...');
        updateProgress(30);
        
        // 백엔드로 파일 전송
        const response = await fetch(`${BACKEND_URL}/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        updateProgress(60);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        updateStatus('Processing with Whisper Large model...');
        updateProgress(80);
        
        const result = await response.json();
        
        updateProgress(100);
        updateStatus('Transcription completed!');
        
        // 결과 표시
        displayResults(result.text, result);
        
    } catch (error) {
        console.error('Error processing file:', error);
        
        let errorMessage = 'Error processing file. ';
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Cannot connect to backend server. Please check if the server is running.';
        } else if (error.message.includes('No audio file provided')) {
            errorMessage += 'File upload failed. Please try again.';
        } else if (error.message.includes('Failed to load Whisper model')) {
            errorMessage += 'Backend model loading failed. Please restart the server.';
        } else {
            errorMessage += `${error.message}`;
        }
        
        alert(errorMessage);
        resetConverter();
    }
}

function updateProgress(percentage) {
    document.getElementById('progressFill').style.width = percentage + '%';
}

function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

function displayResults(transcriptionText, fullResult = null) {
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('transcriptionText').value = transcriptionText;
    
    // 추가 정보 콘솔 출력
    if (fullResult) {
        console.log('Full transcription result:', fullResult);
        if (fullResult.language) {
            console.log('Detected language:', fullResult.language);
        }
        if (fullResult.segments) {
            console.log('Segments count:', fullResult.segments.length);
        }
    }
}

function downloadTranscription() {
    const text = document.getElementById('transcriptionText').value;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function copyToClipboard() {
    const textArea = document.getElementById('transcriptionText');
    const button = event.target;
    const originalText = button.textContent;
    
    try {
        // 현대적인 Clipboard API 사용
        await navigator.clipboard.writeText(textArea.value);
        button.textContent = 'Copied!';
        button.style.backgroundColor = '#27ae60';
    } catch (err) {
        // Fallback for older browsers
        textArea.select();
        document.execCommand('copy');
        button.textContent = 'Copied!';
        button.style.backgroundColor = '#27ae60';
    }
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '#f39c12';
    }, 2000);
}

function resetConverter() {
    // UI 상태 완전 초기화
    document.querySelector('.upload-section').style.display = 'block';
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';
    
    // 파일 입력 초기화
    const fileInput = document.getElementById('audioFile');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // 업로드 영역 스타일 초기화
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.remove('dragover');
    }
    
    // 진행상태 초기화
    updateProgress(0);
    updateStatus('');
    
    console.log('Converter reset completed');
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    // 필요한 정리 작업이 있다면 여기에 추가
}); 