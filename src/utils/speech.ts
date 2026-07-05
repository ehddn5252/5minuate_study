// F-25: 듣는 5분 학습 — 브라우저 내장 Web Speech API(SpeechSynthesis)로 텍스트를 낭독한다.
// 신규 서버/유료 인프라 없이 기기 내장 음성 합성만 사용한다.

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakQueue(texts: string[], rate: number, onEnd?: () => void): void {
  if (!isSpeechSupported() || texts.length === 0) return;
  window.speechSynthesis.cancel();
  texts.forEach((text, i) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = rate;
    if (i === texts.length - 1 && onEnd) {
      utter.onend = onEnd;
    }
    window.speechSynthesis.speak(utter);
  });
}

export function pauseSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.pause();
}

export function resumeSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.resume();
}

export function stopSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return isSpeechSupported() && window.speechSynthesis.speaking;
}

export function isPaused(): boolean {
  return isSpeechSupported() && window.speechSynthesis.paused;
}
