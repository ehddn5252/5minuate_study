import { useState } from 'react';
import { useQuizStore } from '../store';
import type { Quiz } from '../types';

interface QuizCardProps {
  quiz: Quiz;
  index: number;
  total: number;
  onAnswer: (correct: boolean) => void;
}

export default function QuizCard({ quiz, index, total, onAnswer }: QuizCardProps) {
  const { updateQuiz } = useQuizStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [shortInput, setShortInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [selfJudge, setSelfJudge] = useState<boolean | null>(null);

  const handleMultipleChoice = (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
    onAnswer(option === quiz.answer);
  };

  const handleShortAnswer = () => {
    if (revealed) return;
    setRevealed(true);
  };

  const handleSelfJudge = (correct: boolean) => {
    if (selfJudge !== null) return;
    setSelfJudge(correct);
    onAnswer(correct);
  };

  const handleToggleBookmark = () => {
    updateQuiz({ ...quiz, bookmarked: !quiz.bookmarked });
  };

  const isCorrect =
    quiz.type === 'multiple_choice' ? revealed && selected === quiz.answer : selfJudge === true;

  // 단답형은 채점 기준이 애매할 수 있어 자동 비교 대신 사용자가 직접 정답/오답을 판단
  const awaitingSelfJudge = quiz.type === 'short_answer' && revealed && selfJudge === null;
  const showFeedback = quiz.type === 'multiple_choice' ? revealed : selfJudge !== null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {quiz.type === 'multiple_choice' ? '객관식' : '단답형'}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {index + 1} / {total}
          </span>
          <button
            onClick={handleToggleBookmark}
            className={`text-lg leading-none min-h-[28px] min-w-[28px] flex items-center justify-center transition-colors ${
              quiz.bookmarked ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'
            }`}
            aria-label="내 문제집에 담기"
          >
            {quiz.bookmarked ? '🔖' : '📑'}
          </button>
        </div>
      </div>

      <p className="text-gray-900 text-base font-medium leading-relaxed mb-5">
        {quiz.question}
      </p>

      {quiz.type === 'multiple_choice' && quiz.options ? (
        <div className="space-y-3">
          {quiz.options.map((option) => {
            let cls =
              'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors min-h-[44px] ';
            if (!revealed) {
              cls += 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50';
            } else if (option === quiz.answer) {
              cls += 'border-green-500 bg-green-50 text-green-700';
            } else if (option === selected) {
              cls += 'border-red-400 bg-red-50 text-red-700';
            } else {
              cls += 'border-gray-200 text-gray-400';
            }
            return (
              <button
                key={option}
                onClick={() => handleMultipleChoice(option)}
                className={cls}
                disabled={revealed}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={shortInput}
            onChange={(e) => setShortInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !revealed && handleShortAnswer()}
            placeholder="답을 입력하세요"
            disabled={revealed}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
          />
          {!revealed && (
            <button
              onClick={handleShortAnswer}
              disabled={!shortInput.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px] disabled:opacity-40"
            >
              제출
            </button>
          )}
        </div>
      )}

      {awaitingSelfJudge && (
        <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-sm text-gray-600 mb-1">
            정답: <strong>{quiz.answer}</strong>
          </p>
          <p className="text-gray-600 text-sm mb-3">{quiz.explanation}</p>
          <p className="text-sm font-semibold text-gray-700 mb-2">내 답이 맞았나요?</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSelfJudge(true)}
              className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-medium text-sm min-h-[44px] active:opacity-80 transition-opacity"
            >
              ⭕ 맞았어요
            </button>
            <button
              onClick={() => handleSelfJudge(false)}
              className="flex-1 py-2.5 rounded-xl bg-red-400 text-white font-medium text-sm min-h-[44px] active:opacity-80 transition-opacity"
            >
              ❌ 틀렸어요
            </button>
          </div>
        </div>
      )}

      {showFeedback && (
        <div
          className={`mt-4 p-4 rounded-xl ${
            isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <p
            className={`font-semibold text-sm mb-1 ${
              isCorrect ? 'text-green-700' : 'text-amber-700'
            }`}
          >
            {isCorrect ? '정답입니다!' : '다음에 다시 나와요'}
          </p>
          {!isCorrect && (
            <p className="text-amber-600 text-sm mb-1">
              정답: <strong>{quiz.answer}</strong>
            </p>
          )}
          <p className="text-gray-600 text-sm">{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}
