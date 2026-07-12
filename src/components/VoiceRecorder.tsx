import { useEffect, useRef, useState } from 'react';
import {
  isVoiceRecordingSupported,
  pickRecordingMimeType,
  saveRecording,
  getRecordingByQuiz,
  deleteRecording,
} from '../utils/voiceRecording';
import type { RecordingKind } from '../utils/voiceRecording';

interface VoiceRecorderProps {
  quizId: string;
  kind?: RecordingKind;
  label?: string;
}

export default function VoiceRecorder({ quizId, kind = 'answer', label }: VoiceRecorderProps) {
  const [supported] = useState(isVoiceRecordingSupported);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 문항이 바뀌면 그 문항에 저장된 녹음이 있는지 다시 불러온다
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    getRecordingByQuiz(quizId, kind).then((rec) => {
      if (cancelled) return;
      setRecordingId(rec?.id ?? null);
      setAudioUrl(rec ? URL.createObjectURL(rec.blob) : null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, kind]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  if (!supported) return null;

  const handleStartRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const saved = await saveRecording(quizId, blob, mimeType || 'audio/webm', kind);
        setRecordingId(saved.id);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError('마이크 권한이 필요해요.');
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleDelete = async () => {
    if (!recordingId) return;
    await deleteRecording(recordingId);
    setRecordingId(null);
    setAudioUrl(null);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isRecording ? (
        <button
          type="button"
          onClick={handleStopRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-medium animate-pulse"
        >
          ⏹ 녹음 중지
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStartRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
        >
          🎤 {audioUrl ? '다시 녹음' : (label ?? '내 답변 녹음')}
        </button>
      )}
      {audioUrl && !isRecording && (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={audioUrl} controls className="h-8 max-w-[160px]" />
          <button
            type="button"
            onClick={handleDelete}
            className="text-gray-300 hover:text-red-400 text-sm min-h-[28px] min-w-[28px] flex items-center justify-center"
            aria-label="녹음 삭제"
          >
            ✕
          </button>
        </>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
