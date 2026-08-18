import { useState } from 'react';
import { useQuizStore } from '../store';
import { getMascotFace } from '../utils/mascot';
import { removeFromWrongPool } from '../utils/storage';
import { reportBankQuestion } from '../services/questionBank';
import { playAnswerSound } from '../utils/celebration';
import VoiceRecorder from './VoiceRecorder';
import type { MateTone, Quiz } from '../types';

interface QuizCardProps {
  quiz: Quiz;
  index: number;
  total: number;
  onAnswer: (correct: boolean) => void;
  mateTone?: MateTone;
}

type ReportState = 'idle' | 'confirming' | 'sending' | 'done';

export default function QuizCard({ quiz, index, total, onAnswer, mateTone }: QuizCardProps) {
  const { updateQuiz, deleteQuiz } = useQuizStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [shortInput, setShortInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [selfJudge, setSelfJudge] = useState<boolean | null>(null);
  const [reportState, setReportState] = useState<ReportState>('idle');
  const [reportMessage, setReportMessage] = useState('');

  const handleMultipleChoice = (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
    const correct = option === quiz.answer;
    playAnswerSound(correct);
    onAnswer(correct);
  };

  const handleShortAnswer = () => {
    if (revealed) return;
    setRevealed(true);
  };

  const handleSelfJudge = (correct: boolean) => {
    if (selfJudge !== null) return;
    setSelfJudge(correct);
    playAnswerSound(correct);
    onAnswer(correct);
  };

  const handleToggleBookmark = () => {
    updateQuiz({ ...quiz, bookmarked: !quiz.bookmarked });
  };

  // question_bank(사전 제작 문제집) 문제면 즉시 지우지 않고 검토 목록에만 신고를 남기고,
  // 그 외(개인용 AI 생성 문제)는 이미 내 데이터라 바로 지워도 안전하므로 즉시 삭제한다.
  const handleConfirmReport = async () => {
    setReportState('sending');
    if (quiz.bankQuestionId) {
      const result = await reportBankQuestion(quiz.bankQuestionId);
      if (result.error) {
        setReportMessage(result.error);
        setReportState('confirming');
        return;
      }
      setReportMessage('제보했어요. 검토 후 반영할게요!');
    } else {
      deleteQuiz(quiz.id);
      removeFromWrongPool(quiz.goalId, quiz.id);
      setReportMessage('삭제했어요. 다음부터는 이 문제가 안 나와요.');
    }
    setReportState('done');
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium min-h-[28px] transition-colors ${
              quiz.bookmarked ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400 hover:text-amber-500'
            }`}
            aria-label="내 문제집에 담기"
          >
            <span aria-hidden="true">{quiz.bookmarked ? '🔖' : '📑'}</span>
            {quiz.bookmarked ? '담음' : '내 문제집에 담기'}
          </button>
        </div>
      </div>

      <p className="text-gray-900 text-base font-medium leading-relaxed mb-4">
        {quiz.question}
      </p>

      {/* F-45: 정답을 확인하기 전에 먼저 소리 내어 답해보고 녹음할 수 있게 함 */}
      <div className="mb-5">
        <VoiceRecorder quizId={quiz.id} questionText={quiz.question} />
      </div>

      {quiz.type === 'multiple_choice' && quiz.options ? (
        <div className="space-y-3">
          {quiz.options.map((option) => {
            const isCorrectOption = option === quiz.answer;
            const isWrongPick = option === selected && !isCorrectOption;
            // 듀오링고식 "정답은 확 튀고, 오답은 흔들리는" 즉각 반응 — 패널뿐 아니라
            // 실제로 누른 버튼 자체에도 애니메이션을 줘야 손끝에서 바로 느껴진다.
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
              <button
                key={option}
                onClick={() => handleMultipleChoice(option)}
                className={cls}
                disabled={revealed}
              >
                <span>{option}</span>
                {revealed && isCorrectOption && (
                  <span className="flex-shrink-0 text-green-600 animate-count-up-pop" aria-hidden="true">✓</span>
                )}
                {revealed && isWrongPick && (
                  <span className="flex-shrink-0 text-red-500 animate-count-up-pop" aria-hidden="true">✕</span>
                )}
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
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent text-base"
          />
          {!revealed && (
            <button
              onClick={handleShortAnswer}
              disabled={!shortInput.trim()}
              className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px] disabled:opacity-40"
            >
              제출
            </button>
          )}
        </div>
      )}

      {awaitingSelfJudge && (
        <div className="mt-4 p-4 rounded-xl bg-[var(--accent-50)] border border-[var(--accent-100)]">
          <p className="text-sm text-gray-600 mb-1">
            정답: <strong>{quiz.answer}</strong>
          </p>
          <p className="text-gray-600 text-sm mb-3">{quiz.explanation}</p>
          <p className="text-sm font-semibold text-gray-700 mb-2">내 답이 맞았나요?</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSelfJudge(true)}
              className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-medium text-sm min-h-[44px] active:scale-95 transition-transform"
            >
              ⭕ 맞았어요
            </button>
            <button
              onClick={() => handleSelfJudge(false)}
              className="flex-1 py-2.5 rounded-xl bg-red-400 text-white font-medium text-sm min-h-[44px] active:scale-95 transition-transform"
            >
              ❌ 틀렸어요
            </button>
          </div>
        </div>
      )}

      {showFeedback && (
        <div
          key={isCorrect ? 'correct' : 'wrong'}
          className={`mt-4 p-4 rounded-xl ${
            isCorrect
              ? 'bg-green-50 border border-green-200 animate-feedback-pop'
              : 'bg-amber-50 border border-amber-200 animate-feedback-shake'
          }`}
        >
          <p
            className={`font-semibold text-sm mb-1 flex items-center gap-1.5 ${
              isCorrect ? 'text-green-700' : 'text-amber-700'
            }`}
          >
            {isCorrect ? (
              <img src="/mascot.png" alt="마스코트" className="w-6 h-6 inline-block animate-count-up-pop" />
            ) : (
              <span className="text-lg inline-block animate-count-up-pop">{getMascotFace('wrong', mateTone)}</span>
            )}
            {isCorrect ? '정답입니다!' : '다음에 다시 나와요'}
          </p>
          {!isCorrect && (
            <p className="text-amber-600 text-sm mb-1">
              정답: <strong>{quiz.answer}</strong>
            </p>
          )}
          <p className="text-gray-600 text-sm">{quiz.explanation}</p>
          {/* D-5: 자기설명 효과 — 해설을 눈으로 읽기만 하는 것보다, 왜 틀렸는지 스스로
              말로 설명해보는 쪽이 개념 정정과 장기 기억에 더 효과적이라는 연구를 반영 */}
          {!isCorrect && (
            <div className="mt-3 pt-3 border-t border-amber-100">
              <VoiceRecorder quizId={quiz.id} kind="explanation" label="왜 틀렸는지 설명하기" questionText={quiz.question} />
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-amber-100/60">
            {reportState === 'idle' && (
              <button
                type="button"
                onClick={() => setReportState('confirming')}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                🚩 문제가 잘못됐나요?
              </button>
            )}
            {reportState === 'confirming' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">
                  {quiz.bankQuestionId ? '이 문제를 신고할까요? 검토 목록에 남아요.' : '이 문제를 신고할까요? 바로 삭제되고 다시 안 나와요.'}
                </span>
                <button type="button" onClick={() => setReportState('idle')} className="text-xs text-gray-400">
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReport}
                  className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-medium"
                >
                  신고
                </button>
              </div>
            )}
            {reportState === 'sending' && <span className="text-xs text-gray-400">신고하는 중…</span>}
            {reportState === 'done' && <span className="text-xs text-gray-500">🚩 {reportMessage}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
