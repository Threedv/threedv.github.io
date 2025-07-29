#!/bin/bash

echo "🔧 M4A to TXT Converter Setup"
echo "==============================="

# Check Python version
python_version=$(python3 --version 2>&1 | grep -Po '(?<=Python )\d+\.\d+')
if [[ $? -eq 0 ]]; then
    echo "✅ Python 3 found: $python_version"
else
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check if pip is available
if command -v pip3 &> /dev/null; then
    echo "✅ pip3 found"
else
    echo "❌ pip3 not found. Please install pip"
    exit 1
fi

# Check for CUDA
echo "🔍 Checking for CUDA support..."
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected:"
    nvidia-smi --query-gpu=name --format=csv,noheader,nounits
else
    echo "⚠️  No NVIDIA GPU detected. Will use CPU (slower processing)"
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

if [[ $? -eq 0 ]]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check PyTorch CUDA availability
echo "🔍 Checking PyTorch CUDA availability..."
python3 -c "import torch; print('✅ CUDA available:', torch.cuda.is_available()); print('GPU count:', torch.cuda.device_count())" 2>/dev/null

echo ""
echo "🎉 Setup completed!"
echo ""
echo "🚀 To start the server:"
echo "   python3 whisper_backend.py"
echo ""
echo "🌐 Then open whisper-converter.html in your browser" 