import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore } from '../store';
import { getAllRecordings, deleteRecording } from '../utils/voiceRecording';
import type { VoiceRecording } from '../utils/voiceRecording';
import BottomNav from '../components/BottomNav';

interface RecordingRow {
  recording: VoiceRecording;
  question: string;
}

export default function RecordingsScreen() {
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { quizzes } = useQuizStore();
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllRecordings().then((recs) => {
      if (cancelled) return;
      setRecordings(recs);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 녹음 목록이 바뀔 때마다 재생용 objectURL을 새로 만들고, 이전 URL은 정리한다
  useEffect(() => {
    const urls: Record<string, string> = {};
    recordings.forEach((rec) => {
      urls[rec.id] = URL.createObjectURL(rec.blob);
    });
    setAudioUrls(urls);
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [recordings]);

  const handleDelete = async (id: string) => {
    await deleteRecording(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  // F-46: 목표 하나 = 챕터 하나로 취급해 그룹핑한다. 목표(또는 문제)가 삭제된 녹음은
  // "삭제된 목표" 묶음으로 남겨 재생·삭제는 계속 가능하게 한다.
  const sections = (() => {
    const map = new Map<string, RecordingRow[]>();
    recordings.forEach((recording) => {
      const quiz = quizzes.find((q) => q.id === recording.quizId);
      const goal = quiz ? goals.find((g) => g.id === quiz.goalId) : undefined;
      const chapter = goal?.topic ?? quiz?.orphanedGoalTopic ?? '삭제된 목표';
      const question = quiz?.question ?? '삭제된 문제';
      const list = map.get(chapter) ?? [];
      list.push({ recording, question });
      map.set(chapter, list);
    });
    return Array.from(map.entries()).map(([chapter, rows]) => ({ chapter, rows }));
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">녹음 모음</h1>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-16">불러오는 중...</p>
        ) : sections.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎤</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">녹음한 답변이 없어요</h2>
            <p className="text-gray-500 text-sm">
              문제를 풀고 정답을 확인한 뒤<br />내 답변을 녹음해보세요.
            </p>
          </div>
        ) : (
          sections.map(({ chapter, rows }) => (
            <div key={chapter} className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
                {chapter}
              </h2>
              {rows.map(({ recording, question }) => (
                <div key={recording.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-gray-900 text-sm font-medium leading-snug flex-1">{question}</p>
                    <button
                      onClick={() => handleDelete(recording.id)}
                      className="flex-shrink-0 text-gray-300 hover:text-red-400 text-lg leading-none min-h-[28px] min-w-[28px] flex items-center justify-center"
                      aria-label="녹음 삭제"
                    >
                      ✕
                    </button>
                  </div>
                  {audioUrls[recording.id] && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio src={audioUrls[recording.id]} controls className="w-full h-8" />
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
