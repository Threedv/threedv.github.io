#!/bin/bash

echo "🚀 Starting M4A to TXT Converter Backend Server"
echo "==============================================="

# Check if dependencies are installed
if ! python3 -c "import whisper, torch, flask" 2>/dev/null; then
    echo "❌ Dependencies not found. Please run setup.sh first:"
    echo "   chmod +x setup.sh && ./setup.sh"
    exit 1
fi

# Check CUDA availability
echo "🔍 Checking GPU status..."
python3 -c "
import torch
if torch.cuda.is_available():
    print('✅ CUDA available - GPU acceleration enabled')
    print(f'GPU: {torch.cuda.get_device_name()}')
else:
    print('⚠️  CUDA not available - using CPU (slower)')
"

echo ""
echo "🔄 Starting Whisper backend server..."
echo "📍 Server will be available at: http://localhost:5000"
echo "🌐 Open whisper-converter.html in your browser after server starts"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the Python server
python3 whisper_backend.py 