import { useNavigate } from 'react-router-dom';
import { TEMPLATES } from '../data/templates';
import BottomNav from '../components/BottomNav';

// 언어 학습 전용 허브: "정형화 트랙"(사전 제작 커리큘럼 보유)과 "AI로 직접 만들기"를
// 한 화면에서 고르게 한다. 새 목표 생성 폼은 따로 만들지 않고 기존 GoalCreateScreen을
// 쿼리 파라미터(?templateId= / ?topic=)로 재사용한다.
const QUICK_TOPICS = [
  { label: '일본어 기초 회화', topic: '일본어 기초 회화와 히라가나' },
  { label: '중국어 회화', topic: '중국어 기초 회화와 병음' },
  { label: '스페인어 기초', topic: '스페인어 기초 문법과 회화' },
  { label: 'JLPT N3 대비', topic: 'JLPT N3 대비 어휘와 문법' },
];

export default function LanguageHubScreen() {
  const navigate = useNavigate();

  // "정형화 트랙"의 기준은 curriculumId 보유 여부다(하드코딩 나열이 아님) — 사전 제작
  // 커리큘럼이 새로 늘어나도 이 화면 로직을 건드릴 필요가 없다.
  const structuredTracks = TEMPLATES.filter((t) => t.curriculumId);
  // curriculumId는 없지만 어학 카테고리인 템플릿(TOEIC 등)은 AI 생성 섹션의 빠른 시작 칩으로.
  const languageTemplates = TEMPLATES.filter((t) => !t.curriculumId && t.category === '어학');

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-16">
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
          <div>
            <h1 className="text-xl font-bold text-gray-900">🌐 언어 학습</h1>
            <p className="text-gray-400 text-xs mt-0.5">정형화된 트랙으로 시작하거나, AI로 원하는 언어를 바로 만들어요</p>
          </div>
        </div>

        <section className="mb-8">
          <p className="text-sm font-semibold text-gray-700 mb-3">📚 정형화 트랙</p>
          {structuredTracks.length === 0 ? (
            <p className="text-gray-400 text-sm">아직 준비된 트랙이 없어요.</p>
          ) : (
            structuredTracks.map((tpl) => (
              <div key={tpl.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl flex-shrink-0">{tpl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{tpl.recommendedDays}일 커리큘럼</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-3">
                  Day 1~10은 사전 제작 문제로 바로 시작, Day 11부터는 AI가 그날그날 맞춰 만들어요.
                </p>
                <button
                  onClick={() => navigate(`/goals/create?templateId=${tpl.id}`)}
                  className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px]"
                >
                  시작하기
                </button>
              </div>
            ))
          )}
        </section>

        <section>
          <p className="text-sm font-semibold text-gray-700 mb-3">✨ AI로 직접 만들기</p>
          <p className="text-xs text-gray-400 mb-3">원하는 언어나 시험을 알려주면 AI가 요약과 문제를 맞춤 생성해요.</p>

          {languageTemplates.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
              {languageTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => navigate(`/goals/create?templateId=${tpl.id}`)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-[var(--accent-50)] border border-[var(--accent-200)] rounded-xl text-sm font-medium text-[var(--accent-700)]"
                >
                  <span>{tpl.icon}</span>
                  <span>{tpl.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_TOPICS.map((q) => (
              <button
                key={q.label}
                onClick={() => navigate(`/goals/create?topic=${encodeURIComponent(q.topic)}`)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[var(--accent-300)] hover:text-[var(--accent-600)] transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/goals/create')}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium text-sm min-h-[44px] hover:border-[var(--accent-300)] hover:text-[var(--accent-400)] transition-colors"
          >
            + 새로운 언어 학습 만들기
          </button>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
