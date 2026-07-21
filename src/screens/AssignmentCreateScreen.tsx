import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createAssignment, type DraftQuestion } from '../services/academy';
import { sanitizeQuiz } from '../utils/quizValidation';
import { generateGoalContent } from '../services/gemini';
import type { QuizLevel, QuizType } from '../types';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function farFutureStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

const LEVEL_LABEL: Record<QuizLevel, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };

export default function AssignmentCreateScreen() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(todayStr());
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);

  const [qType, setQType] = useState<QuizType>('multiple_choice');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qAnswer, setQAnswer] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qError, setQError] = useState('');

  // AI로 문제 후보를 만들고, 그중 선생님이 원하는 것만 골라서 담는 흐름
  const [aiTopic, setAiTopic] = useState('');
  const [aiRawContent, setAiRawContent] = useState('');
  const [aiLevel, setAiLevel] = useState<QuizLevel>('intermediate');
  const [aiCount, setAiCount] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiCandidates, setAiCandidates] = useState<DraftQuestion[]>([]);
  const [aiSelected, setAiSelected] = useState<boolean[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const resetQuestionForm = () => {
    setQText('');
    setQOptions(['', '', '', '']);
    setQAnswer('');
    setQExplanation('');
    setQError('');
  };

  const handleAddQuestion = () => {
    const sanitized = sanitizeQuiz({
      question: qText,
      type: qType,
      options: qType === 'multiple_choice' ? qOptions : undefined,
      answer: qAnswer,
      explanation: qExplanation,
    });
    if (!sanitized) {
      setQError('문제 내용을 확인해주세요 (정답이 보기 중 하나와 일치해야 해요).');
      return;
    }
    setQuestions((prev) => [...prev, sanitized]);
    resetQuestionForm();
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateCandidates = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    setAiError('');
    setAiCandidates([]);
    try {
      const result = await generateGoalContent(
        'assignment-draft',
        aiTopic.trim(),
        farFutureStr(),
        aiLevel,
        aiRawContent.trim() || undefined,
        false,
        'plain',
        aiCount
      );
      const candidates: DraftQuestion[] = result.quizPool.map((q) => ({
        question: q.question,
        type: q.type,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      }));
      setAiCandidates(candidates);
      setAiSelected(candidates.map(() => true));
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleToggleCandidate = (index: number) => {
    setAiSelected((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleAddSelectedCandidates = () => {
    const picked = aiCandidates.filter((_, i) => aiSelected[i]);
    setQuestions((prev) => [...prev, ...picked]);
    setAiCandidates([]);
    setAiSelected([]);
  };

  const handleSave = async () => {
    if (!classId || !title.trim()) return;
    setSaving(true);
    setSaveError('');
    const result = await createAssignment(classId, title.trim(), dueDate, questions);
    if (result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }
    navigate(`/teacher/classes/${classId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-md mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center mb-4"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-4">+ 숙제 내기</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 3과 부정사 정리"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-900">✨ AI로 문제 후보 만들기</h2>
          <p className="text-xs text-gray-400">주제를 입력하면 AI가 문제 후보를 만들어요. 마음에 드는 것만 골라 담으세요.</p>

          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="주제 (예: 3과 부정사)"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
          />
          <textarea
            value={aiRawContent}
            onChange={(e) => setAiRawContent(e.target.value)}
            placeholder="참고 자료(선택) — 필기나 교재 내용을 붙여넣으면 더 정확해져요"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
          />

          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as QuizLevel[]).map((lv) => (
              <button
                key={lv}
                onClick={() => setAiLevel(lv)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium min-h-[40px] ${aiLevel === lv ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {LEVEL_LABEL[lv]}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">문제 수</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAiCount((c) => Math.max(3, c - 1))}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-medium"
              >
                −
              </button>
              <span className="text-sm font-medium text-gray-900 w-6 text-center">{aiCount}</span>
              <button
                onClick={() => setAiCount((c) => Math.min(15, c + 1))}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-medium"
              >
                +
              </button>
            </div>
          </div>

          {aiError && <p className="text-red-500 text-sm">{aiError}</p>}

          <button
            onClick={handleGenerateCandidates}
            disabled={!aiTopic.trim() || aiGenerating}
            className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-40"
          >
            {aiGenerating ? '문제 만드는 중…' : '문제 후보 만들기'}
          </button>

          {aiCandidates.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {aiCandidates.map((c, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${aiSelected[i] ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'}`}
                >
                  <input
                    type="checkbox"
                    checked={aiSelected[i] ?? false}
                    onChange={() => handleToggleCandidate(i)}
                    className="mt-1 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">{c.type === 'multiple_choice' ? '객관식' : '단답형'}</p>
                    <p className="text-sm text-gray-800">{c.question}</p>
                    <p className="text-xs text-gray-500 mt-1">정답: {c.answer}</p>
                  </div>
                </label>
              ))}
              <button
                onClick={handleAddSelectedCandidates}
                disabled={!aiSelected.some(Boolean)}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-40"
              >
                선택한 문제 담기 ({aiSelected.filter(Boolean).length}개)
              </button>
            </div>
          )}
        </div>

        {questions.length > 0 && (
          <div className="space-y-2 mb-4">
            {questions.map((q, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{i + 1}. {q.type === 'multiple_choice' ? '객관식' : '단답형'}</p>
                  <p className="text-sm text-gray-800 truncate">{q.question}</p>
                </div>
                <button onClick={() => handleRemoveQuestion(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0 text-sm">
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-900">문제 추가</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setQType('multiple_choice')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] ${qType === 'multiple_choice' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              객관식
            </button>
            <button
              onClick={() => setQType('short_answer')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] ${qType === 'short_answer' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              단답형
            </button>
          </div>

          <textarea
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="문제 내용"
            rows={2}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base resize-none"
          />

          {qType === 'multiple_choice' && (
            <div className="space-y-2">
              {qOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...qOptions];
                    next[i] = e.target.value;
                    setQOptions(next);
                  }}
                  placeholder={`보기 ${i + 1}`}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ))}
            </div>
          )}

          <input
            type="text"
            value={qAnswer}
            onChange={(e) => setQAnswer(e.target.value)}
            placeholder={qType === 'multiple_choice' ? '정답 (보기 중 하나와 똑같이)' : '정답'}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <input
            type="text"
            value={qExplanation}
            onChange={(e) => setQExplanation(e.target.value)}
            placeholder="해설"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />

          {qError && <p className="text-red-500 text-sm">{qError}</p>}

          <button
            onClick={handleAddQuestion}
            className="w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 font-medium text-sm min-h-[44px]"
          >
            이 문제 추가
          </button>
        </div>

        {saveError && <p className="text-red-500 text-sm mb-3">{saveError}</p>}

        <button
          onClick={handleSave}
          disabled={!title.trim() || questions.length === 0 || saving}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-40"
        >
          {saving ? '저장 중…' : `숙제 저장 (문제 ${questions.length}개)`}
        </button>
      </div>
    </div>
  );
}
