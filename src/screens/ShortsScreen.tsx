import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurriculum } from '../data/curriculum';
import { fetchFromPool, buildCacheKey } from '../services/contentPool';
import { TEMPLATES } from '../data/templates';
import { playAnswerSound } from '../utils/celebration';

// ── 타입 ──────────────────────────────────────────────────────────────────

interface ConceptCard {
  type: 'concept';
  day: number;
  topic: string;
  bullets: string[];
  templateName: string;
}
interface QuizCard {
  type: 'quiz';
  day: number;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}
interface CompleteCard {
  type: 'complete';
}
type ShortsCard = ConceptCard | QuizCard | CompleteCard;

// ── 카드 생성 ────────────────────────────────────────────────────────────

async function buildCards(templateId: string): Promise<ShortsCard[]> {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return [];

  const cards: ShortsCard[] = [];

  if (template.curriculumId) {
    const curriculum = getCurriculum(template.curriculumId);
    const days = curriculum?.days.slice(0, 5) ?? [];

    for (const day of days) {
      const bullets = day.content
        .split('\n')
        .filter((l) => l.startsWith('•'))
        .slice(0, 4)
        .map((l) => l.replace(/^•\s*/, '').trim());

      cards.push({ type: 'concept', day: day.day, topic: day.topic, bullets, templateName: template.name });

      const poolData = await fetchFromPool(buildCacheKey(templateId, day.day));
      const mcQuiz = poolData?.quizzes.find((q) => q.options && q.options.length >= 2);
      if (mcQuiz && mcQuiz.options) {
        cards.push({
          type: 'quiz',
          day: day.day,
          question: mcQuiz.question,
          options: mcQuiz.options,
          answer: mcQuiz.answer,
          explanation: mcQuiz.explanation,
        });
      }
    }
  } else {
    // 커리큘럼 없는 템플릿: 풀에서 퀴즈만 가져옴
    for (let d = 1; d <= 5; d++) {
      const poolData = await fetchFromPool(buildCacheKey(templateId, d));
      if (poolData) {
        const mcQuizzes = poolData.quizzes.filter((q) => q.options && q.options.length >= 2);
        if (mcQuizzes.length > 0) {
          const q = mcQuizzes[0];
          cards.push({
            type: 'quiz',
            day: d,
            question: q.question,
            options: q.options!,
            answer: q.answer,
            explanation: q.explanation,
          });
        }
      }
    }
  }

  cards.push({ type: 'complete' });
  return cards;
}

// ── 개념 카드 ─────────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-[var(--accent-600)] to-violet-700',
  'from-blue-600 to-[var(--accent-700)]',
  'from-violet-600 to-purple-700',
  'from-sky-600 to-blue-700',
  'from-purple-600 to-[var(--accent-800)]',
];

function ConceptCardView({ card, index, onNext }: { card: ConceptCard; index: number; onNext: () => void }) {
  const grad = GRADIENTS[index % GRADIENTS.length];
  return (
    <div className={`h-full flex flex-col bg-gradient-to-br ${grad} text-white p-6 pt-14`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">Day {card.day}</span>
        <span className="text-xs text-white/70">{card.templateName}</span>
      </div>
      <h2 className="text-2xl font-bold leading-tight mb-6">{card.topic}</h2>
      <ul className="space-y-3 flex-1">
        {card.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <p className="text-base leading-relaxed text-white/95">{b}</p>
          </li>
        ))}
      </ul>
      <button
        onClick={onNext}
        className="mt-6 w-full py-4 bg-white/20 hover:bg-white/30 rounded-2xl font-semibold text-base transition-colors"
      >
        다음 ↑
      </button>
    </div>
  );
}

// ── 퀴즈 카드 ─────────────────────────────────────────────────────────────

function QuizCardView({ card, onAnswer, chosen }: { card: QuizCard; onAnswer: (opt: string) => void; chosen?: string }) {
  const revealed = chosen !== undefined;
  const isCorrect = chosen === card.answer;

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white p-6 pt-14">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs font-semibold bg-white/15 px-3 py-1 rounded-full">Day {card.day} · 퀴즈</span>
      </div>

      <p className="text-lg font-semibold leading-snug mb-6 flex-shrink-0">{card.question}</p>

      <div className="space-y-3 flex-1">
        {card.options.map((opt, i) => {
          let style = 'border-white/20 bg-white/5 text-white';
          if (revealed) {
            if (opt === card.answer) style = 'border-green-400 bg-green-500/20 text-green-300';
            else if (opt === chosen) style = 'border-red-400 bg-red-500/20 text-red-300';
            else style = 'border-white/10 bg-white/3 text-white/40';
          }
          return (
            <button
              key={i}
              onClick={() => !revealed && onAnswer(opt)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${style}`}
            >
              <span className="font-bold mr-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className={`mt-4 p-4 rounded-xl ${isCorrect ? 'bg-green-500/20 border border-green-500/40' : 'bg-red-500/20 border border-red-500/40'}`}>
          <p className={`text-sm font-bold mb-1 ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
            {isCorrect ? '✓ 정답!' : '✗ 오답'}
          </p>
          <p className="text-sm text-white/80 leading-relaxed">{card.explanation}</p>
        </div>
      )}
    </div>
  );
}

// ── 완료 카드 ─────────────────────────────────────────────────────────────

function CompleteCardView({
  correct,
  total,
  templateId,
}: {
  correct: number;
  total: number;
  templateId: string;
}) {
  const navigate = useNavigate();
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const emoji = pct === 100 ? '🏆' : pct >= 60 ? '🎉' : '💪';

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 pt-14 items-center justify-center text-center">
      <div className="text-6xl mb-4">{emoji}</div>
      <h2 className="text-2xl font-bold mb-2">쇼츠 완료!</h2>
      {total > 0 && (
        <p className="text-white/80 text-base mb-2">
          퀴즈 {total}개 중 <span className="font-bold text-white">{correct}개</span> 정답
        </p>
      )}
      <p className="text-white/70 text-sm mb-8">
        {pct === 100 ? '완벽해요! 정식으로 공부해볼까요?' : '조금 더 공부하면 완벽해질 거예요!'}
      </p>

      <button
        onClick={() => navigate(`/goals/create?templateId=${templateId}`)}
        className="w-full max-w-xs py-4 bg-white text-emerald-700 font-bold text-base rounded-2xl mb-3 shadow-lg"
      >
        목표 만들고 제대로 공부하기
      </button>
      <button
        onClick={() => navigate('/')}
        className="text-white/70 text-sm py-2"
      >
        홈으로
      </button>
    </div>
  );
}

// ── 진행 표시 ────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  const display = Math.min(total, 10);
  const idx = Math.min(current, display - 1);
  return (
    <div className="absolute top-6 left-0 right-0 flex justify-center gap-1 z-10 pointer-events-none">
      {Array.from({ length: display }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all ${
            i === idx ? 'w-6 bg-white' : i < idx ? 'w-2 bg-white/60' : 'w-2 bg-white/25'
          }`}
        />
      ))}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────

export default function ShortsScreen() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [cards, setCards] = useState<ShortsCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [noContent, setNoContent] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [animating, setAnimating] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!templateId) return;
    buildCards(templateId).then((c) => {
      if (c.length <= 1) setNoContent(true);
      setCards(c);
      setLoading(false);
    });
  }, [templateId]);

  const goNext = () => {
    if (animating || currentIndex >= cards.length - 1) return;
    setAnimating(true);
    setCurrentIndex((i) => i + 1);
    setTimeout(() => setAnimating(false), 320);
  };

  const goPrev = () => {
    if (animating || currentIndex <= 0) return;
    setAnimating(true);
    setCurrentIndex((i) => i - 1);
    setTimeout(() => setAnimating(false), 320);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
  };

  const handleAnswer = (cardIndex: number, option: string) => {
    if (answers[cardIndex] !== undefined) return;
    const card = cards[cardIndex];
    if (card?.type === 'quiz') playAnswerSound(option === card.answer);
    setAnswers((prev) => ({ ...prev, [cardIndex]: option }));
  };

  const quizCards = cards.filter((c): c is QuizCard => c.type === 'quiz');
  const correctCount = quizCards.filter((c) => answers[cards.indexOf(c)] === c.answer).length;

  // 로딩
  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <svg className="animate-spin w-10 h-10 text-[var(--accent-400)]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-white/70">콘텐츠 불러오는 중…</p>
      </div>
    );
  }

  // 콘텐츠 없음
  if (noContent) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-white px-6 text-center">
        <div className="text-5xl">📚</div>
        <h2 className="text-xl font-bold">아직 콘텐츠가 없어요</h2>
        <p className="text-white/60 text-sm">이 템플릿을 처음으로 공부하고<br/>콘텐츠를 만들어보세요!</p>
        <button
          onClick={() => navigate(`/goals/create`)}
          className="mt-4 px-8 py-3 bg-[var(--accent-600)] rounded-xl font-semibold"
        >
          목표 만들기
        </button>
        <button onClick={() => navigate(-1)} className="text-white/40 text-sm">뒤로</button>
      </div>
    );
  }

  const template = TEMPLATES.find((t) => t.id === templateId);

  return (
    <div
      className="h-screen overflow-hidden relative bg-slate-900"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-5 right-4 z-20 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center text-lg"
      >
        ✕
      </button>

      {/* 진행 표시 */}
      <ProgressDots total={cards.length} current={currentIndex} />

      {/* 카드 슬라이더 */}
      <div
        className="h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${currentIndex * 100}%)` }}
      >
        {cards.map((card, i) => (
          <div key={i} className="h-screen overflow-hidden relative">
            {card.type === 'concept' && (
              <ConceptCardView card={card} index={i} onNext={goNext} />
            )}
            {card.type === 'quiz' && (
              <QuizCardView
                card={card}
                chosen={answers[i]}
                onAnswer={(opt) => handleAnswer(i, opt)}
              />
            )}
            {card.type === 'complete' && (
              <CompleteCardView
                correct={correctCount}
                total={quizCards.length}
                templateId={templateId ?? ''}
              />
            )}

            {/* 퀴즈 답 선택 후 다음 버튼 */}
            {card.type === 'quiz' && answers[i] !== undefined && (
              <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-slate-900">
                <button
                  onClick={goNext}
                  className="w-full py-4 bg-[var(--accent-600)] text-white rounded-2xl font-semibold text-base"
                >
                  다음 ↑
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 하단 탭 힌트 (개념 카드 외) */}
      {cards[currentIndex]?.type === 'quiz' && answers[currentIndex] === undefined && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
          <p className="text-white/30 text-xs">정답을 선택하세요</p>
        </div>
      )}

      {/* 템플릿 이름 하단 표시 */}
      {template && cards[currentIndex]?.type !== 'complete' && (
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <p className="text-white/25 text-xs">{template.icon} {template.name}</p>
        </div>
      )}
    </div>
  );
}
