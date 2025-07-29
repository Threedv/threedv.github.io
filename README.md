# M4A to TXT Converter with GPU-Accelerated Whisper

A web-based audio transcription tool using OpenAI's Whisper Large model with GPU acceleration.

## Features
- GPU-accelerated Whisper Large model for high-quality transcription
- Support for M4A, MP3, WAV, and FLAC audio formats
- Real-time progress tracking
- Download transcription as TXT file
- Copy to clipboard functionality
- Modern, responsive web interface

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Backend Server
```bash
python whisper_backend.py
```
The server will start on `http://localhost:5000`

### 3. Open the Web Interface
Open `whisper-converter.html` in your web browser.

## Usage
1. Ensure the backend server is running
2. Open the web interface
3. Upload or drag & drop your audio file
4. Wait for the GPU-accelerated transcription to complete
5. Download or copy the transcribed text

## Requirements
- Python 3.8+
- PyTorch with CUDA support (for GPU acceleration)
- OpenAI Whisper
- Flask
- A CUDA-compatible GPU (recommended for faster processing)

## Architecture
- **Frontend**: HTML/CSS/JavaScript web interface
- **Backend**: Flask server with Whisper Large model
- **Processing**: GPU-accelerated transcription using PyTorch CUDA