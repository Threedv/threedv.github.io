// GitHub Pages용 Whisper Converter - Client Side
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// 모델 캐싱 설정
env.allowLocalModels = false;
env.useBrowserCache = true;

let whisperPipeline = null;
let isModelLoaded = false;

// 더 나은 Whisper 모델 사용 (medium이 품질과 속도의 균형점)
const MODEL_NAME = 'Xenova/whisper-medium';

// 모델 초기화
async function initializeWhisper() {
    try {
        updateStatus('Loading Whisper Medium model... (This may take a few minutes on first load)');
        updateProgress(10);
        
        whisperPipeline = await pipeline('automatic-speech-recognition', MODEL_NAME);
        
        updateProgress(100);
        updateStatus('Model loaded successfully!');
        isModelLoaded = true;
        
        return true;
    } catch (error) {
        console.error('Error initializing Whisper:', error);
        updateStatus('Error loading model. Please refresh and try again.');
        return false;
    }
}

// Handle file selection and drag & drop
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const audioFile = document.getElementById('audioFile');
    
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
    // 파일 크기 체크 (50MB 제한)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        alert('File too large. Please select a file smaller than 50MB.');
        return;
    }
    
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
        // Initialize Whisper if not already loaded
        if (!isModelLoaded) {
            const modelLoaded = await initializeWhisper();
            if (!modelLoaded) {
                resetConverter();
                return;
            }
        }
        
        updateStatus('Processing audio file...');
        updateProgress(20);
        
        // 오디오 파일을 URL로 변환
        const audioUrl = URL.createObjectURL(file);
        updateProgress(40);
        
        updateStatus('Transcribing audio with Whisper Medium...');
        updateProgress(60);
        
        // Whisper로 처리 (chunk_length_s로 긴 오디오 처리)
        const result = await whisperPipeline(audioUrl, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: true
        });
        
        // URL 정리
        URL.revokeObjectURL(audioUrl);
        
        updateProgress(90);
        updateStatus('Finalizing transcription...');
        updateProgress(100);
        
        // 결과 처리
        let transcriptionText = '';
        if (typeof result.text === 'string') {
            transcriptionText = result.text;
        } else if (result.chunks && Array.isArray(result.chunks)) {
            transcriptionText = result.chunks.map(chunk => chunk.text).join(' ');
        } else {
            transcriptionText = 'Transcription completed but text format is unexpected.';
        }
        
        // Display results
        displayResults(transcriptionText, result);
        
    } catch (error) {
        console.error('Error processing file:', error);
        
        // 더 구체적인 에러 메시지
        let errorMessage = 'Error processing file. ';
        if (error.message.includes('CORS')) {
            errorMessage += 'CORS error - try refreshing the page.';
        } else if (error.message.includes('memory') || error.message.includes('Memory')) {
            errorMessage += 'Not enough memory. Try a smaller file or refresh the page.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += 'Network error. Check your internet connection.';
        } else {
            errorMessage += 'Please try again with a different file.';
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
        if (fullResult.chunks) {
            console.log('Detected segments:', fullResult.chunks.length);
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