// Whisper Converter JavaScript
let pipeline = null;
let isModelLoaded = false;

// Initialize the Whisper pipeline
async function initializeWhisper() {
    try {
        const { pipeline: createPipeline } = await import('https://cdn.skypack.dev/@xenova/transformers');
        
        updateStatus('Loading Whisper model... This may take a few minutes on first load.');
        updateProgress(10);
        
        pipeline = await createPipeline('automatic-speech-recognition', 'Xenova/whisper-small');
        
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
    // Validate file type
    const validTypes = ['audio/m4a', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/x-m4a'];
    if (!validTypes.some(type => file.type === type || file.name.toLowerCase().endsWith(type.split('/')[1]))) {
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
        
        // Convert file to audio buffer
        const audioBuffer = await file.arrayBuffer();
        updateProgress(40);
        
        updateStatus('Transcribing audio...');
        updateProgress(60);
        
        // Process with Whisper
        const result = await pipeline(audioBuffer);
        updateProgress(90);
        
        updateStatus('Finalizing transcription...');
        updateProgress(100);
        
        // Display results
        displayResults(result.text);
        
    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file. Please try again with a different file.');
        resetConverter();
    }
}

function updateProgress(percentage) {
    document.getElementById('progressFill').style.width = percentage + '%';
}

function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

function displayResults(transcriptionText) {
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('transcriptionText').value = transcriptionText;
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
