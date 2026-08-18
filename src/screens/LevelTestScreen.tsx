import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TEMPLATES } from '../data/templates';
import { fetchLevelTestQuestions, computeRecommendedLevel, type LevelTestQuestion } from '../services/questionBank';
import { playAnswerSound } from '../utils/celebration';
import type { QuizLevel } from '../types';

const LEVEL_LABEL: Record<QuizLevel, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

export default function LevelTestScreen() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const template = TEMPLATES.find((t) => t.id === templateId);

  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [questions, setQuestions] = useState<LevelTestQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<{ difficulty: QuizLevel; correct: boolean }[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!template?.curriculumId) {
      setUnsupported(true);
      setLoading(false);
      return;
    }
    fetchLevelTestQuestions(template.curriculumId).then((qs) => {
      if (!qs) {
        setUnsupported(true);
      } else {
        setQuestions(qs);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const currentQuiz = questions[index];
  const isLast = index === questions.length - 1;
  const recommendedLevel = finished ? computeRecommendedLevel(results) : null;

  const handleAnswer = (option: string) => {
    if (revealed || !currentQuiz) return;
    const correct = option === currentQuiz.answer;
    setSelected(option);
    setRevealed(true);
    playAnswerSound(correct);
    setResults((prev) => [...prev, { difficulty: currentQuiz.difficulty, correct }]);
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  const handleUseLevel = (level: QuizLevel) => {
    navigate(`/goals/create?templateId=${templateId}&level=${level}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">문제 불러오는 중…</div>;
  }

  if (unsupported || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">🎯</div>
        <p className="text-gray-500 text-sm">이 템플릿은 아직 레벨테스트를 지원하지 않아요.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px]"
        >
          뒤로
        </button>
      </div>
    );
  }

  if (finished && recommendedLevel) {
    const score = results.filter((r) => r.correct).length;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🎯</div>
        <h1 className="text-xl font-bold text-gray-900">레벨테스트 완료!</h1>
        <p className="text-gray-500 text-sm">{questions.length}문제 중 {score}문제 정답</p>
        <div className="w-full max-w-xs bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 mb-1">추천 난이도</p>
          <p className="text-2xl font-bold text-[var(--accent-600)]">{LEVEL_LABEL[recommendedLevel]}</p>
        </div>
        <button
          onClick={() => handleUseLevel(recommendedLevel)}
          className="w-full max-w-xs py-4 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-base min-h-[44px] active:scale-95 transition-transform"
        >
          {LEVEL_LABEL[recommendedLevel]}으로 목표 만들기
        </button>
        <button
          onClick={() => navigate(`/goals/create?templateId=${templateId}`)}
          className="text-gray-400 text-sm py-2"
        >
          직접 난이도 고를래요
        </button>
      </div>
    );
  }

  if (!currentQuiz) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">문제를 찾을 수 없어요.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">🎯 {template.name} 레벨테스트</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-500)] rounded-full transition-all"
                style={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-gray-900 text-base font-medium leading-relaxed mb-4">{currentQuiz.question}</p>

          <div className="space-y-3">
            {currentQuiz.options.map((option) => {
              const isCorrectOption = option === currentQuiz.answer;
              const isWrongPick = option === selected && !isCorrectOption;
              let cls =
                'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px] flex items-center justify-between gap-2 ';
              if (!revealed) {
                cls += 'border-gray-200 text-gray-700 hover:border-[var(--accent-300)] hover:bg-[var(--accent-50)] active:scale-[0.97]';
              } else if (isCorrectOption) {
                cls += 'border-green-500 bg-green-50 text-green-700 ring-4 ring-green-100 animate-feedback-pop';
              } else if (isWrongPick) {
                cls += 'border-red-400 bg-red-50 text-red-700 animate-feedback-shake';
              } else {
                cls += 'border-gray-200 text-gray-400';
              }
              return (
                <button key={option} onClick={() => handleAnswer(option)} className={cls} disabled={revealed}>
                  <span>{option}</span>
                  {revealed && isCorrectOption && <span className="text-green-600" aria-hidden="true">✓</span>}
                  {revealed && isWrongPick && <span className="text-red-500" aria-hidden="true">✕</span>}
                </button>
              );
            })}
          </div>

          {revealed && (
            <button
              onClick={handleNext}
              className="w-full mt-4 py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px] active:scale-95 transition-transform"
            >
              {isLast ? '결과 보기' : '다음 문제'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
