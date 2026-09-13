import { useMemo, useState } from 'react';
import { shuffle } from '../utils/shuffle';
import type { Quiz } from '../types';

interface PretestQuizCardProps {
  quiz: Quiz;
  onPick: () => void;
}

// F-82: 프리테스트(pretesting effect) 전용 경량 카드. QuizCard와 의도적으로 완전히 분리했다 —
// quiz.answer를 아예 읽지 않아 구조적으로 정오답 판정이 불가능하고, 북마크·신고·음성녹음·
// 마스코트 애니메이션 같은 "시험" 톤 UI도 없다. 정답을 몰라도 되는 "찍어보기"라는 걸
// 명확히 하기 위해서다 — SRS(간격 반복) 필드도 이 컴포넌트 어디에서도 건드리지 않는다.
export default function PretestQuizCard({ quiz, onPick }: PretestQuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = useMemo(() => shuffle(quiz.options ?? []), [quiz.id]);

  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
    setTimeout(onPick, 250);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <p className="text-gray-900 text-base font-medium leading-relaxed mb-4">{quiz.question}</p>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={selected !== null}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px] ${
              selected === option
                ? 'border-[var(--accent-500)] bg-[var(--accent-50)] text-[var(--accent-700)]'
                : 'border-gray-200 text-gray-700 hover:border-[var(--accent-300)] hover:bg-[var(--accent-50)] active:scale-[0.97]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
