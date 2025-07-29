#!/usr/bin/env python3
import whisper
import torch
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 프론트엔드에서 접근 허용

# 전역 변수로 모델 저장
model = None

def initialize_model():
    """Whisper 모델 초기화 (GPU 사용)"""
    global model
    try:
        # GPU 사용 가능한지 확인
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        # Large 모델 로드
        logger.info("Loading Whisper large model...")
        model = whisper.load_model("large", device=device)
        logger.info("Model loaded successfully!")
        return True
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "gpu_available": torch.cuda.is_available()
    })

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """오디오 파일을 텍스트로 변환"""
    try:
        # 파일이 업로드되었는지 확인
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # 모델이 로드되었는지 확인
        if model is None:
            logger.info("Model not loaded, initializing...")
            if not initialize_model():
                return jsonify({"error": "Failed to load Whisper model"}), 500
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.m4a') as temp_file:
            audio_file.save(temp_file.name)
            temp_file_path = temp_file.name
        
        try:
            logger.info(f"Transcribing file: {temp_file_path}")
            
            # Whisper로 변환
            result = model.transcribe(temp_file_path)
            
            # 결과 반환
            response_data = {
                "text": result["text"],
                "language": result.get("language", "unknown"),
                "segments": result.get("segments", [])
            }
            
            logger.info("Transcription completed successfully")
            return jsonify(response_data)
            
        finally:
            # 임시 파일 삭제
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Error during transcription: {e}")
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """모델 정보 반환"""
    return jsonify({
        "model_name": "whisper-large",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "model_loaded": model is not None
    })

if __name__ == '__main__':
    logger.info("Starting Whisper Backend Server...")
    
    # 서버 시작 전 모델 초기화
    logger.info("Initializing Whisper model on startup...")
    if initialize_model():
        logger.info("Model initialization completed")
    else:
        logger.warning("Model initialization failed, will retry on first request")
    
    # 서버 시작
    app.run(host='0.0.0.0', port=5000, debug=True) 