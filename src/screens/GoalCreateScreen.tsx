import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore, useAppStore } from '../store';
import { generateGoalContent } from '../services/gemini';
import { generateId } from '../utils/id';
import { TEMPLATES } from '../data/templates';
import type { Goal } from '../types';

export default function GoalCreateScreen() {
  const navigate = useNavigate();
  const { addGoal } = useGoalStore();
  const { addQuizzes } = useQuizStore();
  const { appState } = useAppStore();

  const [topic, setTopic] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | undefined>(undefined);
  const [pickedTemplateId, setPickedTemplateId] = useState<string | undefined>(undefined);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleSelectTemplate = (id: string) => {
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setSelectedTemplateId(id);
    setTopic(tpl.topic);
    setSelectedCurriculumId(tpl.curriculumId);
    setPickedTemplateId(tpl.id);
    const d = new Date();
    d.setDate(d.getDate() + tpl.recommendedDays);
    setDeadline(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !deadline) return;
    setLoading(true);
    setError('');

    try {
      const goalId = generateId();
      const { summary, quizPool } = await generateGoalContent(
        goalId,
        topic,
        deadline,
        appState.geminiApiKey,
        rawContent || undefined
      );

      const today = new Date().toISOString().split('T')[0];
      const daysLeft = Math.ceil(
        (new Date(deadline).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const goal: Goal = {
        id: goalId,
        topic,
        deadline,
        status: 'active',
        createdAt: new Date().toISOString(),
        totalSessions: daysLeft,
        completedSessions: 0,
        streak: 0,
        bestStreak: 0,
        notificationTime: '09:00',
        notificationEnabled: false,
        rawContent: rawContent || undefined,
        templateId: pickedTemplateId,
        curriculumId: selectedCurriculumId,
        dailyPlan: '',
        summaryContent: summary,
        quizPoolIds: quizPool.map((q) => q.id),
      };

      addGoal(goal);
      addQuizzes(quizPool);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '콘텐츠 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-xl font-bold text-gray-900">새 학습 목표</h1>
        </div>

        {/* Template picker */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">🚀 빠른 시작 — 자격증 템플릿</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl.id)}
                disabled={loading}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 w-20 py-3 px-2 rounded-2xl border-2 transition-all ${
                  selectedTemplateId === tpl.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
              >
                <span className="text-2xl">{tpl.icon}</span>
                <span className={`text-xs font-medium text-center leading-tight ${
                  selectedTemplateId === tpl.id ? 'text-indigo-700' : 'text-gray-600'
                }`}>
                  {tpl.name}
                </span>
                <span className="text-xs text-gray-400">{tpl.recommendedDays}일</span>
              </button>
            ))}
          </div>
          {selectedTemplateId && (
            <p className="text-xs text-indigo-500 mt-2 px-1">
              ✓ 템플릿 적용됨 — 주제와 기한이 자동 입력됐어요. 수정 가능합니다.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">직접 입력</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              학습 주제 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => { setTopic(e.target.value); setSelectedTemplateId(null); setSelectedCurriculumId(undefined); setPickedTemplateId(undefined); }}
              placeholder="예: 리액트 훅의 개념과 활용"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              목표 달성 기한 <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={minDateStr}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              참고 자료 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="학습에 참고할 내용을 붙여넣거나 입력하세요..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base resize-none"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-indigo-700 text-sm">
              AI가 학습 요약과 퀴즈 15개를 자동으로 생성합니다.
              약 10~20초 소요됩니다.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !topic.trim() || !deadline}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 콘텐츠 생성 중...
              </span>
            ) : (
              '목표 만들기'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
