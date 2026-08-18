import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listAssignmentQuestions, submitAssignment, getMySubmission, type MySubmission } from '../services/academy';
import { playAnswerSound } from '../utils/celebration';
import type { SharedQuiz } from '../types';

export default function AssignmentSolveScreen() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<SharedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [finished, setFinished] = useState(false);
  // 이미 제출한 숙제를 다시 열면 재풀이 대신 복습(읽기 전용) 화면을 보여준다
  const [existingSubmission, setExistingSubmission] = useState<MySubmission | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [shortInput, setShortInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [selfJudge, setSelfJudge] = useState<boolean | null>(null);

  // 틀린 문제는 채점(제출)이 끝난 뒤 복습용으로 한 번 더 물어봐 큐 뒤로 보낸다 — 실제 점수는
  // 이미 첫 시도 답으로 확정 제출됐으므로 여기서 맞혀도 점수가 바뀌지 않는다(채점 조작 방지).
  const [retryQueue, setRetryQueue] = useState<SharedQuiz[]>([]);
  const [currentRetryQuiz, setCurrentRetryQuiz] = useState<SharedQuiz | null>(null);
  const [inRetryPhase, setInRetryPhase] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;
    Promise.all([listAssignmentQuestions(assignmentId), getMySubmission(assignmentId)]).then(([qs, submission]) => {
      setQuestions(qs);
      setExistingSubmission(submission);
      setLoading(false);
    });
  }, [assignmentId]);

  const quiz = inRetryPhase ? currentRetryQuiz : questions[index];

  const resetQuestionState = () => {
    setSelected(null);
    setShortInput('');
    setRevealed(false);
    setSelfJudge(null);
  };

  // 채점은 서버(submit_assignment RPC)가 실제 정답과 대조해서 하므로, 여기서는 문제별로
  // "제출한 답"만 모아둔다. 객관식은 고른 보기 그대로, 단답형은 자기채점 결과(QuizCard와 동일한
  // 패턴)를 정답 문자열로 변환해서 보낸다 — 클라이언트가 계산한 점수를 그대로 믿지 않는다.
  // 단답형을 틀렸다고 자기채점한 경우엔 빈 문자열 대신 실제로 입력한 답을 그대로 보내서,
  // 교사가 나중에 체크리스트에서 학생이 뭐라고 답했는지 볼 수 있게 한다(채점 결과엔 영향 없음).
  const goNext = async () => {
    const currentQuestion = questions[index];
    if (!currentQuestion) return;
    const answerText =
      currentQuestion.type === 'multiple_choice' ? (selected ?? '') : selfJudge ? currentQuestion.answer : shortInput;
    const wasCorrect =
      currentQuestion.type === 'multiple_choice' ? selected === currentQuestion.answer : selfJudge === true;
    const nextAnswers = [...answers, answerText];
    setAnswers(nextAnswers);
    const nextRetryQueue = wasCorrect ? retryQueue : [...retryQueue, currentQuestion];

    if (index + 1 >= questions.length) {
      const graded = assignmentId ? await submitAssignment(assignmentId, nextAnswers) : null;
      setResult(graded ?? { score: nextAnswers.filter((a, i) => a === questions[i]?.answer).length, total: questions.length });
      if (nextRetryQueue.length > 0) {
        const [head, ...rest] = nextRetryQueue;
        setCurrentRetryQuiz(head);
        setRetryQueue(rest);
        setInRetryPhase(true);
        resetQuestionState();
      } else {
        setFinished(true);
      }
      return;
    }
    setRetryQueue(nextRetryQueue);
    setIndex((i) => i + 1);
    resetQuestionState();
  };

  // 채점과 무관한 복습 라운드 — 여기서 맞혀도 이미 제출된 점수는 바뀌지 않는다
  const goNextRetry = () => {
    if (!currentRetryQuiz) return;
    const wasCorrect =
      currentRetryQuiz.type === 'multiple_choice' ? selected === currentRetryQuiz.answer : selfJudge === true;
    const nextQueue = wasCorrect ? retryQueue : [...retryQueue, currentRetryQuiz];

    if (nextQueue.length === 0) {
      setInRetryPhase(false);
      setCurrentRetryQuiz(null);
      setFinished(true);
      resetQuestionState();
      return;
    }
    const [head, ...rest] = nextQueue;
    setCurrentRetryQuiz(head);
    setRetryQueue(rest);
    resetQuestionState();
  };

  const handleMultipleChoice = (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
    if (quiz) playAnswerSound(option === quiz.answer);
  };

  const handleShortSubmit = () => {
    if (revealed || !shortInput.trim()) return;
    setRevealed(true);
  };

  const handleSelfJudge = (correct: boolean) => {
    if (selfJudge !== null) return;
    setSelfJudge(correct);
    playAnswerSound(correct);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">불러오는 중…</div>;
  }

  if (existingSubmission && !finished) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/assignments')}
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">이미 제출한 숙제예요</h1>
              <p className="text-gray-400 text-xs mt-0.5">
                {existingSubmission.score} / {existingSubmission.total}점
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => {
              const myAnswer = existingSubmission.answers[i] ?? '';
              const isCorrect = myAnswer.trim() === q.answer.trim();
              return (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {q.type === 'multiple_choice' ? '객관식' : '단답형'}
                  </span>
                  <p className="text-gray-900 text-sm font-medium leading-relaxed mt-2 mb-3">
                    {i + 1}. {q.question}
                  </p>
                  <p className={`text-sm ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                    내 답: {myAnswer.trim() ? myAnswer : '(답 없음)'} {isCorrect ? '✅' : '❌'}
                  </p>
                  {!isCorrect && <p className="text-sm text-green-600 mt-1">정답: {q.answer}</p>}
                  <p className="text-xs text-gray-400 mt-2">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-4xl">🎉</div>
        <p className="text-gray-700 text-center font-medium">숙제 완료! {result?.score ?? 0} / {result?.total ?? questions.length}</p>
        <button
          onClick={() => navigate('/assignments')}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px]"
        >
          숙제 목록으로
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
        문제를 찾을 수 없어요.
      </div>
    );
  }

  const isCorrect = quiz.type === 'multiple_choice' ? selected === quiz.answer : selfJudge === true;
  const awaitingSelfJudge = quiz.type === 'short_answer' && revealed && selfJudge === null;
  const showFeedback = quiz.type === 'multiple_choice' ? revealed : selfJudge !== null;

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
          <p className={`text-sm ${inRetryPhase ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
            {inRetryPhase ? `🔁 오답 다시 풀기 · 남은 ${retryQueue.length + 1}개` : `${index + 1} / ${questions.length}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {quiz.type === 'multiple_choice' ? '객관식' : '단답형'}
          </span>
          <p className="text-gray-900 text-base font-medium leading-relaxed mt-2 mb-4">{quiz.question}</p>

          {quiz.type === 'multiple_choice' && quiz.options ? (
            <div className="space-y-3">
              {quiz.options.map((option) => {
                let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors min-h-[44px] ';
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
                  <button key={option} onClick={() => handleMultipleChoice(option)} className={cls} disabled={revealed}>
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
                onKeyDown={(e) => e.key === 'Enter' && handleShortSubmit()}
                placeholder="답을 입력하세요"
                disabled={revealed}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              />
              {!revealed && (
                <button
                  onClick={handleShortSubmit}
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
              <p className="text-sm text-gray-600 mb-1">정답: <strong>{quiz.answer}</strong></p>
              <p className="text-gray-600 text-sm mb-3">{quiz.explanation}</p>
              <p className="text-sm font-semibold text-gray-700 mb-2">내 답이 맞았나요?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelfJudge(true)}
                  className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-medium text-sm min-h-[44px]"
                >
                  ⭕ 맞았어요
                </button>
                <button
                  onClick={() => handleSelfJudge(false)}
                  className="flex-1 py-2.5 rounded-xl bg-red-400 text-white font-medium text-sm min-h-[44px]"
                >
                  ❌ 틀렸어요
                </button>
              </div>
            </div>
          )}

          {showFeedback && (
            <div className={`mt-4 p-4 rounded-xl ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`font-semibold text-sm mb-1 ${isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                {isCorrect ? '정답입니다!' : '아쉬워요'}
              </p>
              {!isCorrect && quiz.type === 'multiple_choice' && (
                <p className="text-amber-600 text-sm mb-1">정답: <strong>{quiz.answer}</strong></p>
              )}
              <p className="text-gray-600 text-sm">{quiz.explanation}</p>
            </div>
          )}

          {showFeedback && (
            <button
              onClick={() => (inRetryPhase ? goNextRetry() : goNext())}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] mt-4 active:scale-95 transition-transform"
            >
              {inRetryPhase
                ? retryQueue.length === 0
                  ? '복습 마치기'
                  : '다음 문제'
                : index + 1 >= questions.length
                  ? '제출하기'
                  : '다음 문제'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
