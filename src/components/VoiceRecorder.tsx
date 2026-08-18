import { useEffect, useRef, useState } from 'react';
import {
  isVoiceRecordingSupported,
  pickRecordingMimeType,
  saveRecording,
  getRecordingByQuiz,
  deleteRecording,
} from '../utils/voiceRecording';
import type { RecordingKind } from '../utils/voiceRecording';
import { getSpeakingFeedback } from '../services/gemini';

interface VoiceRecorderProps {
  quizId: string;
  kind?: RecordingKind;
  label?: string;
  // AI 피드백 프롬프트에 문맥으로 넣을 문제 텍스트 — 없으면 피드백 버튼을 숨긴다
  questionText?: string;
}

export default function VoiceRecorder({ quizId, kind = 'answer', label, questionText }: VoiceRecorderProps) {
  const [supported] = useState(isVoiceRecordingSupported);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
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
      setAudioBlob(rec?.blob ?? null);
      setFeedback('');
      setFeedbackError('');
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
        setAudioBlob(blob);
        setFeedback('');
        setFeedbackError('');
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
    setAudioBlob(null);
    setFeedback('');
    setFeedbackError('');
  };

  const handleGetFeedback = async () => {
    if (!audioBlob || !questionText) return;
    setFeedbackLoading(true);
    setFeedbackError('');
    try {
      const result = await getSpeakingFeedback(audioBlob, audioBlob.type || 'audio/webm', questionText);
      setFeedback(result);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'AI 피드백을 받지 못했어요.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
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

      {audioUrl && !isRecording && questionText && !feedback && (
        <button
          type="button"
          onClick={handleGetFeedback}
          disabled={feedbackLoading}
          className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent-50)] text-[var(--accent-600)] text-xs font-medium hover:bg-[var(--accent-100)] transition-colors disabled:opacity-50"
        >
          {feedbackLoading ? '듣는 중…' : '🤖 AI 피드백 받기'}
        </button>
      )}
      {feedbackError && <span className="text-xs text-red-500">{feedbackError}</span>}
      {feedback && (
        <div className="p-3 rounded-xl bg-[var(--accent-50)] border border-[var(--accent-100)]">
          <p className="text-xs font-semibold text-[var(--accent-600)] mb-1">🤖 AI 피드백</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback}</p>
        </div>
      )}
    </div>
  );
}
