import { useState, useCallback, useRef } from "react";

let instanceCounter = 0;

export function useSpeechToText(onNewText?: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const instanceIdRef = useRef(0);
  const onNewTextRef = useRef(onNewText);
  onNewTextRef.current = onNewText;
  const restartCountRef = useRef(0);

  const startRecording = useCallback(() => {
    setError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Seu navegador não suporta reconhecimento de voz. Tente usar Chrome ou Edge.");
      return false;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    restartCountRef.current = 0;
    const myId = ++instanceCounter;
    instanceIdRef.current = myId;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        if (instanceIdRef.current !== myId) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript.trim();
            if (text && onNewTextRef.current) {
              onNewTextRef.current(text);
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (instanceIdRef.current !== myId) return;
        const errorType = event.error;
        if (errorType === "not-allowed") {
          setError("Permissão de microfone negada. Ative nas configurações do navegador.");
          setIsRecording(false);
          recognitionRef.current = null;
        } else if (errorType === "no-speech") {
          // no-speech is normal, just restart
        } else if (errorType === "network") {
          setError("Erro de rede. Verifique sua conexão.");
          setIsRecording(false);
          recognitionRef.current = null;
        } else if (errorType === "aborted") {
          // User or system aborted, ignore
        } else {
          console.warn("Speech recognition error:", errorType);
        }
      };

      recognition.onend = () => {
        if (instanceIdRef.current !== myId) return;
        if (recognitionRef.current) {
          restartCountRef.current++;
          if (restartCountRef.current > 50) {
            setIsRecording(false);
            recognitionRef.current = null;
            return;
          }
          try {
            setTimeout(() => {
              if (recognitionRef.current && instanceIdRef.current === myId) {
                recognitionRef.current.start();
              }
            }, 100);
          } catch {
            setIsRecording(false);
            recognitionRef.current = null;
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      return true;
    } catch (e) {
      setError("Não foi possível iniciar o reconhecimento de voz.");
      return false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    instanceIdRef.current = 0;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try { recognition?.stop(); } catch {}
    setIsRecording(false);
  }, []);

  const supported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return { isRecording, startRecording, stopRecording, supported, error };
}
