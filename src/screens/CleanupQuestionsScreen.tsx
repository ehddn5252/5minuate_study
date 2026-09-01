import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore, useSessionStore } from '../store';
import BottomNav from '../components/BottomNav';
import { computeStudyScore } from '../services/social';
import { analyzeCleanup, unionQuizIds, type CleanupCategoryId } from '../utils/quizCleanup';
import {
  archiveGoalToBookmarks,
  bulkDeleteQuizzes,
  deleteGoalCascade,
  recordCompletedGoalScore,
} from '../utils/storage';

export default function CleanupQuestionsScreen() {
  const navigate = useNavigate();
  const { goals, loadGoals } = useGoalStore();
  const { quizzes, loadQuizzes } = useQuizStore();
  const { sessions, loadSessions } = useSessionStore();

  const [selected, setSelected] = useState<Set<CleanupCategoryId>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<string | null>(null);

  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'completed'), [goals]);

  const resolveCompletedGoal = (goalId: string, keep: boolean) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    recordCompletedGoalScore(computeStudyScore([goal], sessions.filter((s) => s.goalId === goalId)));
    if (keep) archiveGoalToBookmarks(goalId);
    else deleteGoalCascade(goalId);
    loadGoals();
    loadSessions();
    loadQuizzes();
    setConfirmDeleteGoalId(null);
  };

  const categories = useMemo(() => analyzeCleanup(quizzes, goals), [quizzes, goals]);
  const totalEligible = quizzes.filter((q) => !q.bookmarked).length;
  const bookmarkedCount = quizzes.filter((q) => q.bookmarked).length;
  const toDelete = useMemo(() => unionQuizIds(categories, selected), [categories, selected]);

  const toggle = (id: CleanupCategoryId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirming(false);
    setDoneMsg('');
  };

  const handleDelete = () => {
    if (toDelete.length === 0) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const removed = bulkDeleteQuizzes(toDelete);
    loadQuizzes();
    loadGoals();
    loadSessions();
    setSelected(new Set());
    setConfirming(false);
    setDoneMsg(`${removed}개 문제를 정리했어요.`);
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="뒤로"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">문제 정리</h1>
        </div>

        {completedGoals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-1">완료한 목표</h2>
            <p className="text-xs text-gray-400 mb-3">
              문제집으로 보관하거나 삭제해서 정리하세요.
            </p>
            <div className="space-y-3">
              {completedGoals.map((goal) => {
                const count = quizzes.filter((q) => q.goalId === goal.id).length;
                const isConfirming = confirmDeleteGoalId === goal.id;
                return (
                  <div key={goal.id} className="rounded-xl border border-gray-200 p-3">
                    <p className="text-sm font-medium text-gray-900">{goal.topic}</p>
                    <p className="text-xs text-gray-400 mt-0.5">문제 {count}개</p>
                    {isConfirming ? (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => resolveCompletedGoal(goal.id, false)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                        >
                          삭제 (되돌릴 수 없음)
                        </button>
                        <button
                          onClick={() => setConfirmDeleteGoalId(null)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => resolveCompletedGoal(goal.id, true)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent-600)] text-white text-xs font-semibold"
                        >
                          내 문제집에 보관
                        </button>
                        <button
                          onClick={() => setConfirmDeleteGoalId(goal.id)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <p className="text-sm text-gray-600">
            지금까지 쌓인 문제 <strong>{quizzes.length}개</strong> 중{' '}
            <strong>{totalEligible}개</strong>가 정리 대상이에요.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            북마크한 문제 {bookmarkedCount}개는 어떤 기준에도 지워지지 않아요.
          </p>
        </div>

        <div className="space-y-3">
          {categories.map((category) => {
            const isSelected = selected.has(category.id);
            return (
              <button
                key={category.id}
                onClick={() => toggle(category.id)}
                className={`w-full text-left bg-white rounded-2xl shadow-sm border p-4 transition-colors ${
                  isSelected ? 'border-[var(--accent-500)] ring-1 ring-[var(--accent-200)]' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                      isSelected
                        ? 'bg-[var(--accent-600)] border-[var(--accent-600)] text-white'
                        : 'border-gray-300 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{category.label}</p>
                      <span className="text-sm font-bold text-[var(--accent-600)]">{category.quizIds.length}개</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {doneMsg && (
          <p className="mt-4 text-sm text-[var(--accent-700)] bg-[var(--accent-50)] rounded-xl px-3 py-2">{doneMsg}</p>
        )}

        <button
          onClick={handleDelete}
          disabled={toDelete.length === 0}
          className={`mt-5 w-full py-3 rounded-xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed ${
            confirming ? 'bg-red-600 text-white' : 'bg-[var(--accent-600)] text-white'
          }`}
        >
          {toDelete.length === 0
            ? '정리할 기준을 선택하세요'
            : confirming
              ? `정말 ${toDelete.length}개 삭제하기 (되돌릴 수 없음)`
              : `${toDelete.length}개 문제 정리하기`}
        </button>
        {confirming && (
          <button
            onClick={() => setConfirming(false)}
            className="mt-2 w-full py-2 text-sm text-gray-500"
          >
            취소
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
