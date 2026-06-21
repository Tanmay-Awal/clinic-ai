import pipecat
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
print("Pipecat VADParams:", VADParams)
try:
    params = VADParams(start_secs=0.2, stop_secs=0.5, confidence=0.5)
    print("VADParams initialized successfully:", params)
except Exception as e:
    print("Error initializing VADParams:", e)
