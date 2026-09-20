import { useNavigate } from 'react-router-dom';

// Play 스토어 등록 필수 요건: 로그인 없이도(스토어 심사자 포함) 열람 가능해야 하므로
// App.tsx의 로그인 전/후 라우트 양쪽에 모두 등록돼 있다. 인증 상태를 전혀 참조하지 않는다.
const SUPPORT_EMAIL = 'ehddn5252@gmail.com';
const EFFECTIVE_DATE = '2026-09-14';

export default function PrivacyPolicyScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--page-bg)] px-4 py-8">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">개인정보처리방침</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            닫기
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          시행일: {EFFECTIVE_DATE}<br />
          "소셜런"(이하 "서비스")은 이용자의 개인정보를 아래와 같이 수집·이용합니다.
        </p>

        <section className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">1. 수집하는 정보</h2>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Google 로그인 시: 이메일 주소, Google 계정의 기본 프로필 정보(이름 등)</li>
            <li>서비스 내에서 직접 입력하는 표시 이름(닉네임)</li>
            <li>학습 데이터: 만든 학습 목표, 학습 세션 기록, 생성된 문제와 답안, 오답노트, 배지·업적, 화면 설정</li>
            <li>친구 기능 이용 시: 닉네임 검색 기록, 친구로 연결된 상대와 상호 공개되는 표시 이름·학습 점수</li>
            <li>음성 답변 녹음(마이크 사용 기능을 직접 실행한 경우에만 생성)</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">2. 정보를 이용하는 방법</h2>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>로그인 및 계정 식별, 여러 기기에서 학습 데이터를 이어서 사용할 수 있도록 클라우드에 동기화</li>
            <li>입력한 학습 주제·참고 자료를 바탕으로 AI가 학습 콘텐츠·문제를 생성</li>
            <li>닉네임으로 친구를 찾고, 친구 사이에서만 학습 점수·진행 상황을 보여주는 기능 제공</li>
            <li>문의 응대(이메일 회신)</li>
          </ul>
          <p className="text-sm text-gray-600 mt-2">
            광고 목적으로 개인정보를 이용하거나 분석·트래킹 SDK를 통해 수집하지 않으며, 개인정보를
            제3자에게 판매하지 않습니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">3. 마이크(음성 녹음) 권한</h2>
          <p className="text-sm text-gray-600">
            문제에 음성으로 답하거나 스스로 설명을 녹음하는 기능을 사용할 때만 마이크 접근을
            요청합니다. 녹음 파일은 기본적으로 기기 안(브라우저 저장소)에만 보관되며 서버로
            전송되지 않습니다. 다만 "AI 발음/답변 피드백"처럼 녹음에 대한 AI 평가를 직접 요청하는
            경우에 한해, 해당 녹음이 서버 프록시를 거쳐 평가를 위해 Google Gemini API로 일시
            전송되며, 평가 결과 반환 후 서버에 별도로 저장하지 않습니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">4. 제3자 제공 및 처리 위탁</h2>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li><strong>Supabase</strong>: 로그인 인증 및 학습 데이터 저장(클라우드 데이터베이스)</li>
            <li><strong>Google Gemini API</strong>: 입력한 학습 주제·참고 자료(및 음성 피드백 요청 시 녹음)를 바탕으로 학습 콘텐츠·문제·피드백 생성. Cloudflare(서버 프록시)를 경유하며, 서비스는 별도의 광고·분석 목적 제3자 SDK를 사용하지 않습니다.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">5. 보관 기간 및 삭제</h2>
          <p className="text-sm text-gray-600">
            로그아웃해도 클라우드에 동기화된 학습 데이터는 계정에 남아 재로그인 시 그대로
            복원됩니다. 계정 및 클라우드에 저장된 모든 데이터의 완전한 삭제를 원하시면
            아래 이메일로 삭제를 요청해주세요. 요청 확인 후 지체 없이 삭제해드립니다.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[소셜런] 계정 및 데이터 삭제 요청')}&body=${encodeURIComponent('가입에 사용한 이메일 주소를 알려주시면 확인 후 삭제해드립니다.\n\n')}`}
            className="inline-block mt-2 text-sm font-medium text-[var(--accent-600)] hover:underline"
          >
            계정·데이터 삭제 요청하기 →
          </a>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">6. 이용 대상</h2>
          <p className="text-sm text-gray-600">
            이 서비스는 만 14세 미만 아동을 주 대상으로 하지 않으며, 아동을 대상으로 개인정보를
            의도적으로 수집하지 않습니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">7. 문의</h2>
          <p className="text-sm text-gray-600">
            개인정보 관련 문의는 아래 이메일로 연락해주세요.
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-medium text-[var(--accent-600)] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </section>

        <p className="text-xs text-gray-400">
          이 방침은 서비스 변경에 따라 갱신될 수 있으며, 중요한 변경 시 이 페이지를 통해 고지합니다.
        </p>
      </div>
    </div>
  );
}
