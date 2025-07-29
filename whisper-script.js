// Whisper Converter JavaScript - Backend API Version
const BACKEND_URL = 'http://localhost:5000';  // 백엔드 서버 URL
let isBackendReady = false;

// 백엔드 서버 상태 확인
async function checkBackendHealth() {
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'healthy' && data.model_loaded) {
            isBackendReady = true;
            updateStatus('Backend server is ready!');
            return true;
        } else if (data.status === 'healthy' && !data.model_loaded) {
            updateStatus('Backend server is running but model is not loaded yet...');
            return false;
        }
    } catch (error) {
        console.error('Backend health check failed:', error);
        updateStatus('Backend server is not available. Please start the server.');
        return false;
    }
}

// 모델 정보 가져오기
async function getModelInfo() {
    try {
        const response = await fetch(`${BACKEND_URL}/model-info`);
        const data = await response.json();
        console.log('Model info:', data);
        return data;
    } catch (error) {
        console.error('Failed to get model info:', error);
        return null;
    }
}

// Handle file selection and drag & drop
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const audioFile = document.getElementById('audioFile');
    
    // 페이지 로드 시 백엔드 상태 확인
    checkBackendHealth();
    
    // File input change handler
    audioFile.addEventListener('change', handleFileSelect);
    
    // Drag and drop handlers
    uploadArea.addEventListener('click', () => audioFile.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
});

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
    // Validate file type
    const validTypes = ['audio/m4a', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/x-m4a'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['m4a', 'mp3', 'wav', 'flac'];
    
    if (!validTypes.some(type => file.type === type) && !validExtensions.includes(fileExtension)) {
        alert('Please select a valid audio file (M4A, MP3, WAV, or FLAC)');
        return;
    }
    
    // Show processing section
    document.querySelector('.upload-section').style.display = 'none';
    document.getElementById('processingSection').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';
    
    try {
        // 백엔드 서버 상태 확인
        updateStatus('Checking backend server...');
        updateProgress(5);
        
        const healthCheck = await checkBackendHealth();
        if (!healthCheck) {
            // 서버가 준비되지 않았으면 잠시 대기 후 재시도
            updateStatus('Waiting for backend server to be ready...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const retryHealthCheck = await checkBackendHealth();
            if (!retryHealthCheck) {
                throw new Error('Backend server is not ready. Please start the whisper_backend.py server.');
            }
        }
        
        updateStatus('Uploading file to server...');
        updateProgress(20);
        
        // FormData로 파일 준비
        const formData = new FormData();
        formData.append('audio', file);
        
        updateStatus('Processing with Whisper Large model on GPU...');
        updateProgress(40);
        
        // 백엔드 API 호출
        const response = await fetch(`${BACKEND_URL}/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        updateProgress(80);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Transcription failed');
        }
        
        const result = await response.json();
        updateProgress(100);
        
        updateStatus('Transcription completed!');
        
        // Display results
        displayResults(result.text, result);
        
    } catch (error) {
        console.error('Error processing file:', error);
        alert(`Error: ${error.message}`);
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
    
    // 추가 정보가 있으면 콘솔에 로그
    if (fullResult) {
        console.log('Full transcription result:', fullResult);
        if (fullResult.language) {
            console.log('Detected language:', fullResult.language);
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

function copyToClipboard() {
    const textArea = document.getElementById('transcriptionText');
    textArea.select();
    document.execCommand('copy');
    
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.backgroundColor = '#27ae60';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '#f39c12';
    }, 2000);
}

function resetConverter() {
    document.querySelector('.upload-section').style.display = 'block';
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('audioFile').value = '';
    updateProgress(0);
    updateStatus('');
}
