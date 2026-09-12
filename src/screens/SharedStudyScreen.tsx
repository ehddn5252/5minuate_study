import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { decodeStudyShareLink } from '../services/social';
import { useAppStore, useGoalStore, useQuizStore } from '../store';
import { generateId } from '../utils/id';
import { MAX_ACTIVE_GOALS } from '../utils/goalLimits';
import type { Goal, Quiz, QuizLevel, SharedTopicNote } from '../types';

// F-81: 공유받은 문제집을 학습 목표로 가져올 때, GoalCreateScreen과 동일한 난이도 선택지를 재사용한다.
const LEVEL_OPTIONS: { id: QuizLevel; label: string }[] = [
  { id: 'beginner', label: '초급' },
  { id: 'intermediate', label: '중급' },
  { id: 'advanced', label: '고급' },
];

export default function SharedStudyScreen() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { addQuizzes } = useQuizStore();
  const { appState, updateAppState } = useAppStore();
  const { goals, addGoal } = useGoalStore();
  const [saved, setSaved] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [imported, setImported] = useState(false);
  const [importDeadline, setImportDeadline] = useState('');
  const [importLevel, setImportLevel] = useState<QuizLevel>('intermediate');
  const [importError, setImportError] = useState('');

  const payload = useMemo(() => {
    if (!shareCode) return null;
    return decodeStudyShareLink(shareCode);
  }, [shareCode]);

  if (!payload) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">유효하지 않은 공유 링크예요</p>
          <p className="text-sm text-gray-500 mb-4">공유자가 보낸 링크를 다시 확인해 주세요.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  const quizList = payload.quizList ?? [];
  const label = payload.shareType === 'goal' ? '목표' : payload.shareType === 'session' ? '세션' : '문제집';
  const summaryText = payload.summary || payload.sessionSummary || '';
  const planText = payload.dailyPlan || '';
  const hasNote = !!(summaryText.trim() || planText.trim());
  const canSave = quizList.length > 0 || hasNote;

  const handleSave = () => {
    if (!canSave) return;

    if (quizList.length > 0) {
      const quizzes: Quiz[] = quizList.map((item) => ({
        id: generateId(),
        goalId: '',
        question: item.question,
        type: item.type ?? 'short_answer',
        options: item.options,
        answer: item.answer,
        explanation: item.explanation ?? '',
        isWrong: false,
        wrongCount: 0,
        bookmarked: true,
        // 목표 없이 '내 문제집'에 바로 담기므로, 어느 주제인지 스냅샷으로 남긴다
        orphanedGoalTopic: payload.topic,
      }));
      addQuizzes(quizzes);
    }

    if (hasNote) {
      const note: SharedTopicNote = {
        id: generateId(),
        topic: payload.topic,
        summary: summaryText,
        dailyPlan: planText,
        createdAt: new Date().toISOString(),
      };
      updateAppState({ sharedNotes: [note, ...(appState.sharedNotes ?? [])].slice(0, 100) });
    }

    setSaved(true);
  };

  const saveLabel = quizList.length > 0 && hasNote
    ? `문제 ${quizList.length}개 + 요약 메모를 내 문제집에 저장하기`
    : quizList.length > 0
      ? `이 문제 ${quizList.length}개를 내 문제집에 저장하기`
      : '요약 메모를 내 문제집에 저장하기';

  // F-81: quizList가 있어야 학습 목표(문제 풀 필수)로 승격할 수 있다.
  const canImportAsGoal = quizList.length > 0;
  const activeGoalCount = goals.filter((g) => g.status === 'active').length;
  const goalsFull = activeGoalCount >= MAX_ACTIVE_GOALS;

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const openImportForm = () => {
    // 공유자 목표의 난이도를 상속(입력 최소화) — 레거시 링크는 decodeStudyShareLink에서 이미 'intermediate'로 채워져 있다
    setImportLevel(payload.level ?? 'intermediate');
    setImportError('');
    setShowImportForm(true);
  };

  const handleImportToGoal = () => {
    if (!importDeadline) {
      setImportError('기한을 선택해주세요.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const daysLeft = Math.ceil(
      (new Date(importDeadline).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft < 1) {
      setImportError('오늘 이후 날짜를 선택해주세요.');
      return;
    }

    const goalId = generateId();
    const quizzes: Quiz[] = quizList.map((item) => ({
      id: generateId(),
      goalId,
      question: item.question,
      type: item.type ?? 'short_answer',
      options: item.options,
      answer: item.answer,
      explanation: item.explanation ?? '',
      isWrong: false,
      wrongCount: 0,
      // F-81 동작 규칙: F-80의 '내 문제집 저장'과 달리 일반 목표 소속 문제로 취급한다(북마크 아님).
      bookmarked: false,
    }));

    const goal: Goal = {
      id: goalId,
      topic: payload.topic,
      deadline: importDeadline,
      status: 'active',
      createdAt: new Date().toISOString(),
      totalSessions: daysLeft,
      completedSessions: 0,
      streak: 0,
      bestStreak: 0,
      streakFreezeRemaining: 1,
      notificationTime: '09:00',
      notificationEnabled: false,
      // AI 재호출 없이 공유 페이로드의 요약/계획을 그대로 사용한다(F-81 동작 규칙 3).
      dailyPlan: planText,
      summaryContent: summaryText,
      quizPoolIds: quizzes.map((q) => q.id),
      level: importLevel,
    };

    addGoal(goal);
    addQuizzes(quizzes);
    setShowImportForm(false);
    setImported(true);
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
            공유된 {label}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{payload.topic}</h1>

          {payload.sessionDate && (
            <p className="mt-2 text-xs text-gray-400">세션 날짜: {payload.sessionDate}</p>
          )}

          {summaryText && (
            <div className="mt-4 rounded-xl bg-[var(--accent-50)] border border-[var(--accent-200)] p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{summaryText}</p>
            </div>
          )}

          {planText && (
            <div className="mt-3">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">오늘의 학습 계획</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{planText}</p>
            </div>
          )}

          {quizList.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">문제 {quizList.length}개</h2>
              <div className="space-y-3">
                {quizList.map((item, index) => (
                  <div key={`${item.question}-${index}`} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Q{index + 1}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.question}</p>
                    <p className="mt-2 text-sm font-medium text-[var(--accent-700)]">정답: {item.answer}</p>
                    {item.explanation && <p className="mt-1 text-xs text-gray-500 whitespace-pre-wrap">{item.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            {saved ? (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">'내 문제집'에 저장했어요.</p>
                <button
                  onClick={() => navigate('/my-questions')}
                  className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
                >
                  내 문제집으로 가기
                </button>
              </div>
            ) : canSave ? (
              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
              >
                {saveLabel}
              </button>
            ) : (
              <p className="text-sm text-gray-500 text-center">저장할 내용이 없는 공유예요.</p>
            )}
          </div>

          {canImportAsGoal && (
            <div className="mt-3">
              {imported ? (
                <div className="text-center rounded-xl border border-[var(--accent-200)] bg-[var(--accent-50)] p-4">
                  <p className="text-sm text-[var(--accent-700)] font-medium mb-3">학습 목표로 등록했어요.</p>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
                  >
                    오늘의 학습으로 가기
                  </button>
                </div>
              ) : showImportForm ? (
                goalsFull ? (
                  <div className="text-center rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-700 font-medium mb-1">진행 중인 목표가 가득 찼어요</p>
                    <p className="text-xs text-gray-500 mb-3">
                      동시에 진행할 수 있는 목표는 최대 {MAX_ACTIVE_GOALS}개예요. 기존 목표를 완료하거나 중단한 뒤 다시 시도해주세요.
                    </p>
                    <button
                      onClick={() => navigate('/goals')}
                      className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
                    >
                      목표 목록으로
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                    <div>
                      <label htmlFor="import-deadline" className="block text-sm font-medium text-gray-700 mb-2">
                        목표 달성 기한 <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="import-deadline"
                        type="date"
                        value={importDeadline}
                        onChange={(e) => setImportDeadline(e.target.value)}
                        min={minDateStr}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent text-base"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">난이도</label>
                      <div className="flex gap-2">
                        {LEVEL_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setImportLevel(opt.id)}
                            className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold min-h-[44px] transition-colors ${
                              importLevel === opt.id
                                ? 'border-[var(--accent-500)] bg-[var(--accent-50)] text-[var(--accent-700)]'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-[var(--accent-200)]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {importError && (
                      <p role="alert" className="text-sm text-red-500">{importError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowImportForm(false)}
                        className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleImportToGoal}
                        className="flex-1 py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
                      >
                        학습 목표로 등록하기
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <button
                  onClick={openImportForm}
                  className="w-full py-3 rounded-xl border-2 border-[var(--accent-500)] text-[var(--accent-700)] font-semibold"
                >
                  학습 목표로 가져오기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
