export interface Template {
  id: string;
  icon: string;
  name: string;
  topic: string;
  recommendedDays: number;
  category: string;
  curriculumId?: string;
  // F-29/F-33/F-43: 내신·수능처럼 학교가 정하는 시험일뿐 아니라, 자격증·어학 시험처럼
  // 사용자가 실제로 접수한 "특정 시험일"이 있는 템플릿인지 여부. 이런 템플릿은 임의의
  // 추천 기한을 자동으로 채우지 않고 사용자가 실제 시험 날짜를 직접 입력하도록 유도한다.
  examScoped?: boolean;
}

export const TEMPLATES: Template[] = [
  {
    id: 'iip_practical',
    icon: '💻',
    name: '정보처리기사 실기',
    topic: '정보처리기사 실기 핵심 개념',
    recommendedDays: 60,
    category: 'IT 자격증',
    examScoped: true,
  },
  {
    id: 'toeic_900',
    icon: '🌍',
    name: 'TOEIC 900',
    topic: 'TOEIC 900점 대비 어휘 및 문법',
    recommendedDays: 90,
    category: '어학',
    examScoped: true,
  },
  {
    id: 'driving_written',
    icon: '🚗',
    name: '운전면허 필기',
    topic: '운전면허 1종 보통 필기시험 핵심 요약',
    recommendedDays: 14,
    category: '자격증',
    examScoped: true,
  },
  {
    id: 'korean_history',
    icon: '🏛️',
    name: '한국사능력검정 1급',
    topic: '한국사능력검정시험 심화 1급 시대별 핵심',
    recommendedDays: 45,
    category: '역사',
    examScoped: true,
  },
  {
    id: 'realtor',
    icon: '🏠',
    name: '공인중개사',
    topic: '공인중개사 1차 민법 및 민사특별법 핵심',
    recommendedDays: 90,
    category: '자격증',
    examScoped: true,
  },
  {
    id: 'electrical',
    icon: '⚡',
    name: '전기기사',
    topic: '전기기사 필기 전기자기학 핵심 공식',
    recommendedDays: 60,
    category: 'IT 자격증',
    examScoped: true,
  },
  {
    id: 'computer_app',
    icon: '📊',
    name: '컴활 1급',
    topic: '컴퓨터활용능력 1급 스프레드시트 함수 정리',
    recommendedDays: 30,
    category: 'IT 자격증',
    examScoped: true,
  },
  {
    id: 'english_vocab',
    icon: '📝',
    name: '영어단어 매일',
    topic: '수능 영어 필수 어휘 1000개 완성',
    recommendedDays: 30,
    category: '어학',
    curriculumId: 'english_vocab',
  },
  {
    id: 'react_basics',
    icon: '⚛️',
    name: '리액트 입문',
    topic: 'React 핵심 개념 - 컴포넌트, 훅, 상태 관리',
    recommendedDays: 21,
    category: '개발',
  },
  {
    id: 'python_basics',
    icon: '🐍',
    name: '파이썬 기초',
    topic: 'Python 기초 문법 및 자료구조',
    recommendedDays: 21,
    category: '개발',
  },
  {
    id: 'english_grammar',
    icon: '📖',
    name: '영어 문법 완전 정복',
    topic: '영어 문법 완전 정복 - 8품사부터 가정법까지',
    recommendedDays: 30,
    category: '어학',
    curriculumId: 'english_grammar',
  },
  // F-33: 내신·수능 카테고리 — 학교·학년마다 시험 범위가 달라 고정 커리큘럼 대신
  // topic만 프리필하고 참고자료(rawContent)에 시험 범위를 직접 입력받는 방식
  {
    id: 'middle1_exam',
    icon: '📘',
    name: '중1 내신 대비',
    topic: '중학교 1학년 내신 시험 대비',
    recommendedDays: 14,
    category: '내신·수능',
    examScoped: true,
  },
  {
    id: 'middle2_exam',
    icon: '📗',
    name: '중2 내신 대비',
    topic: '중학교 2학년 내신 시험 대비',
    recommendedDays: 14,
    category: '내신·수능',
    examScoped: true,
  },
  {
    id: 'middle3_exam',
    icon: '📙',
    name: '중3 내신 대비',
    topic: '중학교 3학년 내신 시험 대비',
    recommendedDays: 14,
    category: '내신·수능',
    examScoped: true,
  },
  {
    id: 'high1_exam',
    icon: '📕',
    name: '고1 내신 대비',
    topic: '고등학교 1학년 내신 시험 대비',
    recommendedDays: 14,
    category: '내신·수능',
    examScoped: true,
  },
  {
    id: 'high2_exam',
    icon: '📔',
    name: '고2 내신 대비',
    topic: '고등학교 2학년 내신 시험 대비',
    recommendedDays: 14,
    category: '내신·수능',
    examScoped: true,
  },
  {
    id: 'high3_exam',
    icon: '📒',
    name: '고3 내신 대비',
    topic: '고등학교 3학년 내신 시험 대비',
    recommendedDays: 14,
    category: '내신·수능',
    examScoped: true,
  },
  {
    id: 'suneung_exam',
    icon: '🎯',
    name: '수능 대비',
    topic: '대학수학능력시험 대비',
    recommendedDays: 30,
    category: '내신·수능',
    examScoped: true,
  },
];
