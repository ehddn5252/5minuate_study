import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoalStore, useQuizStore } from '../store';
import { generateGoalContent } from '../services/gemini';
import { generateId } from '../utils/id';
import { TEMPLATES } from '../data/templates';
import { computeAutoQuizCount } from '../utils/quizCount';
import type { Goal, QuizLevel, MateTone } from '../types';

const LEVEL_OPTIONS: { id: QuizLevel; label: string }[] = [
  { id: 'beginner', label: '초급' },
  { id: 'intermediate', label: '중급' },
  { id: 'advanced', label: '고급' },
];

const TONE_OPTIONS: { id: MateTone; label: string; desc: string }[] = [
  { id: 'plain', label: '담백한 선배', desc: '기본' },
  { id: 'friendly', label: '다정한 친구', desc: '편안하게' },
  { id: 'hype', label: '예능 자막체', desc: '텐션 UP' },
];

// F-01: 진행 중 목표는 동시에 최대 5개까지만 허용한다(감사 P-2 후속 — 기획엔 있었지만
// 코드로 구현된 적 없던 규칙을 반영, 원래 문서의 3개 대신 5개로 상향).
const MAX_ACTIVE_GOALS = 5;

export default function GoalCreateScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { goals, addGoal } = useGoalStore();
  const { addQuizzes } = useQuizStore();
  const activeGoalCount = goals.filter((g) => g.status === 'active').length;

  const [topic, setTopic] = useState(() => {
    const tplId = searchParams.get('templateId');
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    return tpl ? tpl.topic : '';
  });
  const [deadline, setDeadline] = useState(() => {
    const tplId = searchParams.get('templateId');
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    if (!tpl || tpl.examScoped) return '';
    const d = new Date();
    d.setDate(d.getDate() + tpl.recommendedDays);
    return d.toISOString().split('T')[0];
  });
  const [rawContent, setRawContent] = useState('');
  const [level, setLevel] = useState<QuizLevel>('intermediate');
  const [practicalMode, setPracticalMode] = useState(false);
  const [mateTone, setMateTone] = useState<MateTone>('plain');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() => searchParams.get('templateId'));
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | undefined>(() => {
    const tplId = searchParams.get('templateId');
    return TEMPLATES.find((t) => t.id === tplId)?.curriculumId;
  });
  const [pickedTemplateId, setPickedTemplateId] = useState<string | undefined>(() => searchParams.get('templateId') ?? undefined);
  // F-29: 내신·수능처럼 학교가 정하는 시험일을 앱이 임의로 추천하지 않는 템플릿인지 여부
  const [examScoped, setExamScoped] = useState<boolean>(() => {
    const tplId = searchParams.get('templateId');
    return TEMPLATES.find((t) => t.id === tplId)?.examScoped ?? false;
  });

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
    setExamScoped(!!tpl.examScoped);
    if (tpl.examScoped) {
      // F-29: 시험일은 학교가 정하므로 추천 기한을 자동으로 채우지 않고 직접 입력하게 함
      setDeadline('');
    } else {
      const d = new Date();
      d.setDate(d.getDate() + tpl.recommendedDays);
      setDeadline(d.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !deadline) return;
    if (activeGoalCount >= MAX_ACTIVE_GOALS) return;
    setLoading(true);
    setError('');

    try {
      const goalId = generateId();
      const today = new Date().toISOString().split('T')[0];
      const daysLeft = Math.ceil(
        (new Date(deadline).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      // F-02/F-44 감사 반영: 사용자가 문제 수를 직접 고르지 않고, 참고 자료 분량과
      // 기한에 맞춰 자동으로 정한다.
      const quizCount = computeAutoQuizCount(rawContent, daysLeft);
      const { summary, quizPool } = await generateGoalContent(
        goalId,
        topic,
        deadline,
        level,
        rawContent || undefined,
        practicalMode,
        mateTone,
        quizCount
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
        level,
        streakFreezeRemaining: 2,
        practicalMode,
        mateTone,
        examScoped,
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

  if (activeGoalCount >= MAX_ACTIVE_GOALS) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🗂️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">진행 중인 목표가 가득 찼어요</h1>
          <p className="text-gray-500 text-sm mb-6">
            동시에 진행할 수 있는 목표는 최대 {MAX_ACTIVE_GOALS}개예요.
            <br />
            기존 목표를 완료하거나 중단한 뒤 새 목표를 추가해주세요.
          </p>
          <button
            onClick={() => navigate('/goals')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px]"
          >
            목표 목록으로
          </button>
        </div>
      </div>
    );
  }

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
          <p className="text-sm font-semibold text-gray-700 mb-3">🚀 빠른 시작 — 자격증·내신/수능 템플릿</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="flex-shrink-0 flex flex-col gap-1">
                <button
                  onClick={() => handleSelectTemplate(tpl.id)}
                  disabled={loading}
                  className={`relative flex flex-col items-center gap-1.5 w-20 py-3 px-2 rounded-2xl border-2 transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  {tpl.examScoped && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {tpl.category}
                    </span>
                  )}
                  <span className="text-2xl mt-1">{tpl.icon}</span>
                  <span className={`text-xs font-medium text-center leading-tight ${
                    selectedTemplateId === tpl.id ? 'text-indigo-700' : 'text-gray-600'
                  }`}>
                    {tpl.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {tpl.examScoped ? '시험일 직접 입력' : `${tpl.recommendedDays}일`}
                  </span>
                </button>
                {!tpl.examScoped && (
                  <button
                    onClick={() => navigate(`/shorts/${tpl.id}`)}
                    className="text-xs text-indigo-500 text-center py-0.5 hover:text-indigo-700"
                  >
                    ⚡ 쇼츠
                  </button>
                )}
              </div>
            ))}
          </div>
          {selectedTemplateId && (
            <p className="text-xs text-indigo-500 mt-2 px-1">
              {examScoped
                ? '✓ 템플릿 적용됨 — 시험 날짜와 범위를 직접 입력해주세요.'
                : '✓ 템플릿 적용됨 — 주제와 기한이 자동 입력됐어요. 수정 가능합니다.'}
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
              onChange={(e) => { setTopic(e.target.value); setSelectedTemplateId(null); setSelectedCurriculumId(undefined); setPickedTemplateId(undefined); setExamScoped(false); }}
              placeholder="예: 리액트 훅의 개념과 활용"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {examScoped ? '시험 날짜' : '목표 달성 기한'} <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={minDateStr}
              placeholder={examScoped ? '예: 2026-09-15' : undefined}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              required
              disabled={loading}
            />
            {examScoped && (
              <p className="text-xs text-gray-400 mt-1">실제 시험 날짜를 입력하세요. 자동으로 채워지지 않아요.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              난이도
            </label>
            <div className="flex gap-2">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLevel(opt.id)}
                  disabled={loading}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold min-h-[44px] transition-colors ${
                    level === opt.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI 학습메이트 말투
            </label>
            <div className="flex gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMateTone(opt.id)}
                  disabled={loading}
                  className={`flex-1 py-3 rounded-xl border-2 text-center min-h-[44px] transition-colors ${
                    mateTone === opt.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200'
                  }`}
                >
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
            <div className="pr-3">
              <p className="text-sm font-medium text-gray-700">실무 연계 강조</p>
              <p className="text-xs text-gray-400 mt-0.5">요약·해설에 "실무에서 이렇게 쓰인다"는 예시를 포함해요</p>
            </div>
            <button
              type="button"
              onClick={() => setPracticalMode((v) => !v)}
              disabled={loading}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                practicalMode ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  practicalMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {examScoped ? '시험 범위' : '참고 자료'} <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder={
                examScoped
                  ? '이번 시험 범위나 출제 기준을 붙여넣어주세요 (예: 1~3단원 교과서 범위, 자격증 출제기준, 시험 공지 내용 등)'
                  : '학습에 참고할 내용을 붙여넣거나 입력하세요...'
              }
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base resize-none"
              disabled={loading}
            />
            {examScoped && (
              <p className="text-xs text-gray-400 mt-1">시험 범위를 입력하면 더 정확한 콘텐츠가 만들어져요.</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-indigo-700 text-sm">
              AI가 참고 자료 양과 학습 기간에 맞춰 학습 요약과 퀴즈를 자동으로 생성합니다.
              약 10~20초 소요됩니다.
            </p>
            <p className="text-indigo-500 text-xs mt-1.5">
              💚 5분 학습은 지금도, 앞으로도 완전 무료예요.
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
