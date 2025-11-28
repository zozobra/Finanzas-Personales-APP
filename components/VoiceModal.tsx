
import React, { useRef, useState, useEffect } from 'react';
import { processFinancialInput } from '../services/geminiService';
import { AiParsedResult } from '../types';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mepRate: number;
  onResult: (result: AiParsedResult) => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({ isOpen, onClose, mepRate, onResult }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
        setIsRecording(false);
        setIsProcessing(false);
        startRecording(); // Auto-start recording for better UX
    } else {
        stopRecordingCleanup();
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("No se pudo acceder al micrófono.");
      onClose();
    }
  };

  const stopRecordingCleanup = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Process with Gemini
        await handleProcessing(audioBlob);
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
    }
  };

  const handleProcessing = async (input: string | Blob) => {
    const result = await processFinancialInput(input, mepRate);
    setIsProcessing(false);
    if (result) {
        onResult(result);
        onClose();
    } else {
        alert("No entendí bien. Intenta de nuevo.");
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in relative flex flex-col items-center">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
            <span className="material-icons-round">close</span>
        </button>

        <h3 className="text-lg font-bold text-slate-800 mb-2">Escuchando...</h3>
        <p className="text-xs text-slate-500 mb-8 text-center">
            Di tu gasto, inversión o ahorro.<br/>
            <span className="italic opacity-70">Ej: "Gaste 15000 en nafta"</span>
        </p>

        {/* Voice Animation */}
        <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`
                w-20 h-20 rounded-full flex items-center justify-center transition-all mb-4
                ${isRecording ? 'bg-red-500 animate-pulse ring-8 ring-red-100' : 'bg-blue-100 hover:bg-blue-200'}
                ${isProcessing ? 'bg-blue-600 scale-110' : ''}
            `}
        >
            <span className={`material-icons-round text-4xl ${isRecording || isProcessing ? 'text-white' : 'text-blue-600'}`}>
                {isProcessing ? 'hourglass_top' : (isRecording ? 'stop' : 'mic')}
            </span>
        </button>
        
        {isProcessing ? (
             <div className="text-center text-sm font-bold text-blue-600 animate-pulse">
                Procesando Inteligencia Artificial...
            </div>
        ) : (
            <div className="text-xs text-slate-400">
                Toque para detener
            </div>
        )}
      </div>
    </div>
  );
};
