export interface CurriculumDay {
  day: number;
  topic: string;
  content: string;
}

export interface Curriculum {
  id: string;
  name: string;
  totalDays: number;
  days: CurriculumDay[];
}

const ENGLISH_GRAMMAR_CURRICULUM: Curriculum = {
  id: 'english_grammar',
  name: '영어 문법 완전 정복',
  totalDays: 30,
  days: [
    {
      day: 1,
      topic: '문장의 구성 요소와 5형식',
      content: `영어 문장의 핵심 구성 요소와 5형식
• 주어(S), 동사(V), 목적어(O), 보어(C), 수식어(M)
• 1형식: S + V (주어 + 자동사) — "The bird sings."
• 2형식: S + V + C (주어 + 연결동사 + 주격보어) — "She looks happy." / be, look, seem, become, feel, smell, taste
• 3형식: S + V + O (주어 + 타동사 + 목적어) — "I love music."
• 4형식: S + V + IO + DO (주어 + 수여동사 + 간접목적어 + 직접목적어) — "He gave me a gift." / give, send, show, tell, teach
• 5형식: S + V + O + OC (주어 + 동사 + 목적어 + 목적격보어) — "They call him a genius." / make, call, find, keep, name
• 문장 형식 구별법: 동사 뒤에 오는 요소가 무엇인지 파악하기`,
    },
    {
      day: 2,
      topic: '8품사 개요',
      content: `영어의 8가지 품사와 역할
• 명사(Noun): 사람, 사물, 장소, 개념의 이름 — book, happiness, Seoul
• 대명사(Pronoun): 명사를 대신 — I, he, they, it, this, who
• 동사(Verb): 동작이나 상태 표현 — run, be, have, seem
• 형용사(Adjective): 명사 수식 — beautiful, large, happy, three
• 부사(Adverb): 동사·형용사·다른 부사 수식 — quickly, very, here, always
• 전치사(Preposition): 명사 앞에 놓여 관계 표현 — in, on, at, by, for, with
• 접속사(Conjunction): 단어나 절을 연결 — and, but, because, although
• 감탄사(Interjection): 감정 표현 — Oh!, Wow!, Oops!
• 같은 단어가 문장에서 다른 품사로 쓰일 수 있음: "back(뒤로) / back(등) / back(후원하다)"`,
    },
    {
      day: 3,
      topic: '명사 - 가산/불가산 명사',
      content: `명사의 종류와 가산/불가산 구분
• 가산 명사(Countable): 셀 수 있음, 단수/복수 구분 — a cat / cats
• 불가산 명사(Uncountable): 셀 수 없음, 관사 a/an 불가, 단수 취급
  - 물질명사: water, coffee, sugar, money, bread
  - 추상명사: love, information, advice, knowledge, news
  - 고유명사: Korea, Tom
• 불가산 명사의 수량 표현: a cup of coffee, a piece of advice, a loaf of bread
• 복수형 만들기 규칙: +s / +es / +ies / 불규칙(man→men, child→children, mouse→mice)
• 집합명사: family, team, committee (단수·복수 모두 가능)
• 주의: "furniture, luggage, equipment, evidence" = 불가산`,
    },
    {
      day: 4,
      topic: '관사 - a/an/the 완전 정복',
      content: `관사의 정확한 사용법
• 부정관사 a/an: 처음 언급, 하나, 불특정 — "I saw a dog."
  - a + 자음 소리: a cat, a university (u 발음이 /ju/)
  - an + 모음 소리: an apple, an hour (h 묵음)
• 정관사 the: 특정 것, 앞서 언급, 유일한 것, 서수·최상급 앞
  - "I saw a dog. The dog was big."
  - "the sun, the moon, the Earth"
  - "the tallest building, the first time"
• 관사 없음(무관사): 고유명사, 복수 일반명사, 불가산 일반명사, 운동/식사/과목
  - "I like coffee." / "She studies math." / "He plays soccer."
• 주의: "go to school(목적)" vs "go to the school(특정 학교 건물)"`,
    },
    {
      day: 5,
      topic: '대명사 - 인칭/소유/재귀/지시/부정대명사',
      content: `다양한 대명사의 종류와 쓰임
• 인칭대명사: 주격/목적격/소유격/소유대명사/재귀대명사
  - I/me/my/mine/myself, he/him/his/his/himself
  - they/them/their/theirs/themselves
• 소유대명사(mine, yours, his, hers, ours, theirs): 명사 역할
  - "This book is mine." (= my book)
• 재귀대명사(-self/-selves): 재귀용법(주어=목적어) vs 강조용법
  - "She hurt herself." / "The president himself came."
• 지시대명사: this/these(가까운), that/those(먼)
• 부정대명사: some(긍정), any(의문/부정), no, all, each, every, both, either, neither
  - "some" 권유 의문문에도: "Would you like some coffee?"`,
    },
    {
      day: 6,
      topic: '현재 시제 3가지',
      content: `현재 시제의 세 가지 형태와 용법
• 단순현재(Simple Present): 습관, 반복, 사실, 진리
  - "I wake up at 7." / "The Earth moves around the Sun."
  - 3인칭 단수 현재: he/she/it + 동사+s/es
• 현재진행(Present Progressive): be + V-ing, 지금 진행 중
  - "She is reading a book now."
  - 상태동사는 진행형 불가: know, believe, love, have(소유), want
• 현재완료(Present Perfect): have/has + p.p.
  - 경험: "I have been to Paris."
  - 완료: "She has just finished the work."
  - 결과: "He has lost his key." (지금도 없다)
  - 계속: "We have known each other for 10 years."
  - 특정 과거 시점(yesterday, ago, last)과 함께 쓰지 않음`,
    },
    {
      day: 7,
      topic: '과거 시제 3가지',
      content: `과거 시제의 세 가지 형태와 용법
• 단순과거(Simple Past): 과거의 완료된 동작/상태, 특정 과거 시점
  - "She graduated in 2020." / "I lived in Busan."
  - 규칙변화: +ed / 불규칙: go→went, see→saw, buy→bought
• 과거진행(Past Progressive): was/were + V-ing, 과거 특정 시점 진행 중
  - "I was sleeping when she called."
  - when+단순과거 vs while+과거진행 구분
• 과거완료(Past Perfect): had + p.p., 과거 이전 사건 (대과거)
  - "When I arrived, she had already left."
  - 시간 순서를 명확히 할 때 사용
• 혼동 주의: "I saw him yesterday." (과거) vs "I have seen him before." (완료·경험)`,
    },
    {
      day: 8,
      topic: '미래 시제 표현',
      content: `미래를 나타내는 다양한 표현
• will + 동사원형: 즉흥적 결정, 예측, 약속
  - "I'll call you tonight." / "It will rain tomorrow."
• be going to + 동사원형: 계획·의도, 근거 있는 예측
  - "I'm going to study abroad next year."
  - "Look at those clouds — it's going to rain."
• 현재진행(be + V-ing): 확정된 가까운 미래 계획
  - "We are meeting at 3 PM."
• 단순현재: 시간표·일정 (교통, 수업 등)
  - "The train leaves at 9."
• will vs be going to 구분:
  - "The phone is ringing." → "I'll get it." (즉흥)
  - "I've decided." → "I'm going to call him." (계획)
• will be V-ing (미래진행), will have p.p. (미래완료)`,
    },
    {
      day: 9,
      topic: '완료 시제 총정리',
      content: `현재완료 / 과거완료 / 미래완료 비교 정리
• 현재완료(have/has + p.p.): 과거→현재 연결
  - 경험/완료/결과/계속 (for, since, already, yet, just, ever, never)
• 과거완료(had + p.p.): 과거→과거 이전 연결
  - "He had eaten before I arrived."
  - before, after, when, by the time과 자주 사용
• 미래완료(will have + p.p.): 미래 특정 시점까지 완료
  - "By next year, she will have lived here for 10 years."
  - "by + 미래 시점"과 함께 사용
• 완료진행형:
  - 현재완료진행: have been V-ing — 과거부터 지금까지 계속 진행
  - "I have been waiting for 2 hours."
• 완료 시제 선택 기준: '기준 시점'이 언제인가 파악`,
    },
    {
      day: 10,
      topic: '조동사 기초 - can, may, must, should',
      content: `핵심 조동사 4가지와 의미
• can: 능력(~할 수 있다), 허가(비공식), 가능성
  - "She can speak three languages."
  - "Can I borrow your pen?"
  - could: can의 과거형, 공손한 요청, 가능성(낮음)
• may: 허가(공식), 가능성(50%)
  - "May I come in?"
  - "It may rain tonight."
  - might: may의 과거형, 가능성(낮음, 불확실)
• must: 강한 의무(~해야 한다), 강한 추론(~임에 틀림없다)
  - "You must wear a seatbelt."
  - "He must be tired." (틀림없이 피곤하다)
  - must not: 금지 / don't have to: 불필요(~할 필요 없다)
• should: 의무·충고(~해야 한다, 약한 의무)
  - "You should see a doctor."
  - ought to: should와 유사, 도덕적 의무 강조`,
    },
    {
      day: 11,
      topic: '조동사 심화 - 추측, 후회 표현',
      content: `조동사 + have + p.p. 패턴과 심화 용법
• must have p.p.: 과거 사실에 대한 강한 추측 (~했음에 틀림없다)
  - "She must have missed the bus."
• should have p.p.: 과거 사실에 대한 후회/비난 (~했어야 했는데 안 했다)
  - "I should have studied harder."
• shouldn't have p.p.: ~하지 말았어야 했는데 했다
  - "You shouldn't have said that."
• could have p.p.: 과거에 할 수 있었지만 안 했다
  - "She could have helped us but didn't."
• might have p.p.: 과거에 ~했을 수도 있다
  - "He might have taken the wrong bus."
• would: 과거 습관(~하곤 했다) = used to
  - "We would go fishing every summer."
• had better + 동사원형: 강한 충고 (~하는 게 낫다, 안 하면 안 좋다)`,
    },
    {
      day: 12,
      topic: '수동태 (Passive Voice)',
      content: `수동태의 형성과 다양한 시제 수동태
• 수동태 기본: be + p.p. (by + 행위자)
  - 능동: "The dog bit the man." → 수동: "The man was bitten by the dog."
• 시제별 수동태:
  - 현재: am/is/are + p.p. — "The report is written every month."
  - 과거: was/were + p.p. — "The cake was eaten."
  - 미래: will be + p.p. — "It will be done tomorrow."
  - 현재완료: have/has been + p.p. — "The letter has been sent."
  - 진행: am/is/are being + p.p. — "The house is being built."
• by 생략: 행위자가 불명확하거나 중요하지 않을 때
• 4형식 수동태: "He gave me a gift." → "I was given a gift." / "A gift was given to me."
• 5형식 수동태: "They call him a genius." → "He is called a genius."
• 주의: 자동사(자동사는 목적어 없어 수동태 불가) — happen, arrive, occur`,
    },
    {
      day: 13,
      topic: '부정사 (To-Infinitive)',
      content: `to 부정사의 세 가지 역할과 주요 용법
• 명사적 용법: 주어, 목적어, 보어 역할
  - "To learn English is fun." (주어)
  - "I want to travel." (목적어)
  - "My dream is to become a doctor." (보어)
• 형용사적 용법: 명사 수식 (명사 뒤에 위치)
  - "I need a pen to write with."
  - "She has many friends to help her."
• 부사적 용법: 목적(~하기 위해), 결과, 원인, 조건
  - "I study hard to pass the exam." (목적)
  - "He grew up to be a scientist." (결과)
• too ~ to 부정사: 너무 ~해서 할 수 없다
  - "It's too heavy to lift."
• enough to 부정사: ~하기에 충분히 ~하다
  - "She's old enough to vote."
• 부정사의 의미상 주어: for + 목적어 + to부정사
  - "It is important for you to study."
• 목적어로 to부정사만 취하는 동사: want, plan, hope, decide, refuse, expect`,
    },
    {
      day: 14,
      topic: '동명사 (Gerund)',
      content: `동명사의 역할과 to부정사와의 비교
• 동명사(V-ing): 동사에서 파생된 명사
  - 주어: "Swimming is good exercise."
  - 목적어: "I enjoy reading."
  - 전치사의 목적어: "She is good at cooking."
  - 보어: "My hobby is collecting stamps."
• 동명사만 목적어로 취하는 동사(암기 필수):
  enjoy, finish, mind, avoid, consider, suggest, keep, quit, practice, give up, put off, admit, deny
• to부정사만 목적어로 취하는 동사:
  want, hope, plan, decide, refuse, expect, wish, promise, agree
• 둘 다 취하지만 의미 차이 있는 동사:
  - remember/forget + V-ing (과거 기억) vs to-V (미래 의도)
  - stop + V-ing (멈추다) vs to-V (멈추고 ~하다)
  - try + V-ing (시험 삼아) vs to-V (노력하다)`,
    },
    {
      day: 15,
      topic: '분사 - 현재분사/과거분사',
      content: `분사의 형태와 명사 수식, 보어 역할
• 현재분사(V-ing): 능동, 진행 의미
  - "a sleeping baby" (자고 있는 아기)
  - "The news was exciting." (보어)
• 과거분사(p.p.): 수동, 완료 의미
  - "a broken window" (깨진 창문)
  - "She seemed tired." (보어)
• 현재분사 vs 동명사 구분:
  - "a sleeping bag" (자는 가방? → 동명사, 용도: 침낭)
  - "a sleeping baby" (자고 있는 아기 → 현재분사)
• 감정 형용사: 현재분사(-ing) vs 과거분사(-ed)
  - interesting(흥미롭게 하는) vs interested(흥미로워하는)
  - boring vs bored / exciting vs excited / tiring vs tired
  - confusing vs confused / satisfying vs satisfied
• 분사의 위치: 단독이면 명사 앞, 구를 이루면 명사 뒤
  - "the boy reading a book (뒤에서 수식)"`,
    },
    {
      day: 16,
      topic: '분사구문 (Participial Phrases)',
      content: `분사구문의 형성과 해석
• 분사구문: 부사절을 분사를 이용해 간결하게 만든 구문
  형성법: 접속사 삭제 → 주어가 같으면 삭제 → 동사를 V-ing로 변환
• 분사구문의 의미:
  - 시간(when/while/after): "Walking home, I met her." (집에 걸어가다가)
  - 이유(because/since/as): "Being tired, he went to bed." (피곤해서)
  - 조건(if): "Turning left, you'll find the bank." (왼쪽으로 돌면)
  - 양보(though/although): "Admitting he's wrong, I still like him."
  - 동시동작(with): "She sat reading a book." (앉아서 책을 읽으며)
• 부정 분사구문: not + V-ing
  - "Not knowing the answer, he was silent."
• 완료 분사구문: having + p.p. (주절보다 앞선 시제)
  - "Having finished the work, she went home."
• 수동 분사구문: being + p.p. (being 생략 가능)
  - "(Being) Written in English, the book is hard to read."`,
    },
    {
      day: 17,
      topic: '형용사 - 비교급과 최상급',
      content: `형용사의 비교 표현 완전 정리
• 원급 비교: as + 형용사/부사 + as
  - "She is as tall as her brother."
  - not as ~ as: "He is not as fast as her."
• 비교급: 형용사 + -er / more + 형용사 + than
  - 단음절: tall→taller, fast→faster
  - 장음절: more beautiful, more expensive
  - 불규칙: good→better, bad→worse, many/much→more, little→less, far→farther/further
  - "She is taller than her sister."
• 최상급: the + 형용사 + -est / the most + 형용사
  - "He is the tallest in the class."
  - 최상급 강조: by far the most, the very best
• 비교급 강조: much, even, far, a lot, still
  - "She is much taller than him."
• 비교급 주요 표현:
  - the + 비교급, the + 비교급: "The more you study, the smarter you get."
  - 비교급 + and + 비교급: "It's getting colder and colder."`,
    },
    {
      day: 18,
      topic: '부사 - 종류와 위치',
      content: `부사의 종류와 문장 내 위치 규칙
• 부사의 종류:
  - 방법(manner): quickly, slowly, carefully, well
  - 장소(place): here, there, nearby, somewhere
  - 시간(time): now, then, yesterday, soon, already
  - 빈도(frequency): always, usually, often, sometimes, rarely, never
  - 정도(degree): very, quite, rather, too, enough, almost
• 빈도부사의 위치: be동사/조동사 뒤, 일반동사 앞
  - "She always arrives early."
  - "He is never late."
• 방법 부사의 위치: 동사 뒤 또는 문장 끝
  - "She sings beautifully."
• -ly로 끝나지 않는 부사 주의: fast, hard, late, early, high, near
  - "She works hard." (hardLY = 거의 ~않다)
  - "He came late." (lately = 최근에)
• 형용사 vs 부사 혼동: "I feel bad." (형용사) / "She drives badly." (부사)`,
    },
    {
      day: 19,
      topic: '전치사 - 시간/장소/방향',
      content: `핵심 전치사의 의미와 사용법
• 시간 전치사:
  - at: 특정 시각, 시점 — at 3 PM, at noon, at night
  - in: 월, 년, 계절, 하루 중 일부 — in March, in 2020, in summer, in the morning
  - on: 날짜, 요일 — on Monday, on July 4th
  - for: 기간(숫자) — for 2 hours, for a week
  - since: 기준 시점부터 — since 2010, since Monday
  - during: ~동안(명사) — during the vacation
  - by: ~까지(완료) — by Friday / until: ~까지(계속) — until Friday
• 장소 전치사:
  - at: 특정 지점 — at the station, at home
  - in: 내부 — in the box, in Seoul
  - on: 위(접촉) — on the table, on the wall
• 방향 전치사:
  - to: 방향 — go to school
  - from: 출발점 — come from Korea
  - into: ~안으로 / out of: ~밖으로 / across: 가로질러 / along: ~을 따라`,
    },
    {
      day: 20,
      topic: '등위접속사와 상관접속사',
      content: `접속사의 종류와 사용법 - 기초편
• 등위접속사(FANBOYS): 같은 문법 단위 연결
  - for(이유), and(그리고), nor(~도 아니고), but(그러나), or(또는), yet(그러나), so(그래서)
  - "I was tired, but I kept working."
  - "She likes coffee and tea."
• 상관접속사: 짝을 이루는 접속사
  - both A and B: A와 B 둘 다 — "Both Tom and Jane came."
  - either A or B: A 또는 B 중 하나
  - neither A nor B: A도 B도 아닌
  - not only A but (also) B: A뿐만 아니라 B도
  - not A but B: A가 아니라 B
  - A as well as B: A뿐만 아니라 B도 (A에 수 일치)
• 상관접속사의 수 일치:
  - both A and B → 복수 동사
  - either A or B / neither A nor B / not only A but B → B에 수 일치
  - "Either he or his friends are wrong."`,
    },
    {
      day: 21,
      topic: '종속접속사 - 부사절',
      content: `부사절을 이끄는 종속접속사 완전 정리
• 시간 접속사:
  - when(~할 때), while(~하는 동안), before(~하기 전에), after(~한 후에)
  - as soon as(~하자마자), until/till(~까지), since(~한 이후로)
  - 시간/조건절에서 미래 대신 현재시제 사용: "When she arrives, I will call you."
• 원인/이유 접속사:
  - because(가장 강한 이유), since/as(이미 아는 이유), now that(~이므로)
• 조건 접속사:
  - if(만약), unless(~하지 않으면), as long as(~하는 한), provided/providing that
• 양보 접속사:
  - although/though/even though(비록 ~이지만 — 사실)
  - even if(비록 ~일지라도 — 가정), whereas(반면에)
• 목적/결과 접속사:
  - so that + 주어 + can(목적: ~하기 위해)
  - so + 형용사/부사 + that(결과: 너무 ~해서 …하다)
  - such + 명사 + that`,
    },
    {
      day: 22,
      topic: '관계대명사 - who, which, that, what',
      content: `관계대명사의 종류와 용법
• 관계대명사: 두 문장을 연결하며 절을 이끄는 대명사
  - 선행사가 사람: who(주격), whom(목적격), whose(소유격)
  - 선행사가 사물/동물: which(주격/목적격), whose/of which(소유격)
  - 사람/사물 모두: that (격식체에서는 whom, which 선호)
  - 선행사 없음: what (~하는 것, thing which)
• 제한적 용법 vs 계속적 용법:
  - 제한적: "The man who lives next door is kind." (특정 사람)
  - 계속적: "Tom, who lives next door, is kind." (콤마 사용, 추가 설명) — that 불가
• that을 쓰는 경우: 선행사에 최상급, the only, the very, all, every 등
• that을 쓸 수 없는 경우: 계속적 용법, 전치사 뒤
• what: "What he said is true." = "The thing that he said is true."
• 목적격 관계대명사 생략 가능: "the book (that/which) I read"`,
    },
    {
      day: 23,
      topic: '관계부사 - when, where, why, how',
      content: `관계부사의 종류와 관계대명사와의 비교
• 관계부사 = 전치사 + 관계대명사
  - when = at/on/in which (선행사: 시간)
  - where = at/in/on which (선행사: 장소)
  - why = for which (선행사: reason)
  - how = in which (선행사: the way — 함께 쓰지 않음)
• 예시:
  - "This is the city where I was born." = "the city in which I was born."
  - "I remember the day when we met." = "the day on which we met."
  - "That's the reason why he left." = "the reason for which he left."
  - "This is how she solved it." (= the way she / the way in which she)
• 선행사 생략 가능: 관계부사 앞의 선행사가 일반적일 때
  - "That is where I grew up." (the place 생략)
• 관계대명사 vs 관계부사 구분:
  - 뒤 절이 완전한 문장이면 → 관계부사
  - 뒤 절에 주어나 목적어가 빠져 있으면 → 관계대명사`,
    },
    {
      day: 24,
      topic: '명사절 - that절/의문사절/if·whether절',
      content: `명사절의 종류와 역할
• that절: 주어·목적어·보어로 쓰이는 명사절
  - "That she passed the exam is surprising." (주어 — 보통 it으로 대신)
  - "I think (that) she is right." (목적어 — that 생략 가능)
  - "The fact is that he lied." (보어)
• 의문사절(간접의문문): 의문사 + 주어 + 동사 (어순 주의!)
  - 직접: "Where does she live?"
  - 간접: "I wonder where she lives." (의문사 뒤 평서문 어순)
  - "Do you know who he is?" (who가 보어면 is 뒤)
• if/whether절: yes/no 의문문의 간접화
  - "I don't know if/whether he will come."
  - whether to-V: "I can't decide whether to go or not."
  - whether는 주어/보어로도 사용 가능, if는 목적어로만
• 주의: 시제 일치 — 주절 과거 → 종속절도 과거/과거완료
  - "She said she was tired."`,
    },
    {
      day: 25,
      topic: '가정법 - 현재/과거/과거완료',
      content: `가정법의 종류와 시제 사용 규칙
• 직설법 vs 가정법: 가정법은 현실과 반대되는 상황 가정
• 가정법 현재: 현재/미래 가능한 일 가정
  - "If it rains, I will stay home." (실제 가능)
  - If + 현재시제, will/can/may + 동사원형
• 가정법 과거: 현재 사실과 반대 가정 (실제로는 아님)
  - "If I had money, I would buy it." (사실: 돈이 없다)
  - If + 과거시제(were은 주어에 상관없이 were), would/could/might + 동사원형
  - "If I were you, I would accept it."
• 가정법 과거완료: 과거 사실과 반대 가정
  - "If she had studied harder, she would have passed."
  - If + had p.p., would/could/might + have p.p.
• I wish 가정법:
  - I wish + 가정법 과거: 현재 이룰 수 없는 소망
  - I wish + 가정법 과거완료: 과거 후회
  - "I wish I could fly." / "I wish I had studied harder."
• as if/as though + 가정법`,
    },
    {
      day: 26,
      topic: '도치 구문 (Inversion)',
      content: `도치가 일어나는 경우와 어순 변화
• 도치: 강조나 문체를 위해 주어와 동사의 어순을 바꿈
• 부정어·제한 표현 도치 (강한 강조):
  - Never, Seldom, Rarely, Hardly, Scarcely, No sooner, Not only, Nor, Neither
  - "Never have I seen such a thing." (= I have never seen ~)
  - "Hardly had she left when it started raining."
  - "Not only did he sing, but he also danced."
• only + 부사(구/절) 도치:
  - "Only then did I understand." / "Only by working hard can you succeed."
• so/neither/nor 도치 (앞 문장 동의):
  - "I like it." → "So do I." / "I don't like it." → "Neither/Nor do I."
• 부사구 도치 (장소·방향 부사구 문두):
  - "On the table lay a book." (동사가 주어 앞)
• if 생략 도치 (가정법):
  - "Were I you, I would go." (= If I were you)
  - "Had I known, I would have helped." (= If I had known)
  - "Should you need help, call me." (= If you should need)`,
    },
    {
      day: 27,
      topic: '강조 구문과 생략',
      content: `It is ~ that 강조 구문과 문장 성분 생략
• It is/was ~ that 강조 구문: 특정 성분을 강조
  - "It was John that broke the window." (주어 강조)
  - "It was yesterday that she arrived." (부사 강조)
  - "It was the book that I needed." (목적어 강조)
  - 강조되는 성분이 사람이면 that 대신 who 가능
• do/does/did 강조: 동사 강조
  - "I do love you." / "She did finish it."
• 생략(Ellipsis): 반복 피하기 위해 이미 언급된 성분 생략
  - 부정사 to 남기고 생략: "I want to go if you want to [go]."
  - 조동사로 대용: "He can swim and so can she."
• 대용(Substitution): so, do so, that, one
  - "Will it rain?" — "I think so." (= that it will rain)
  - "I need a pen. Can I borrow one?" (= a pen)
• 병렬구조: 등위접속사로 연결된 요소는 같은 문법 형태
  - "She likes singing and to dance." (X) → "She likes singing and dancing." (O)`,
    },
    {
      day: 28,
      topic: '수 일치 (Subject-Verb Agreement)',
      content: `주어와 동사의 수 일치 규칙 총정리
• 기본 원칙: 주어의 수에 동사의 수를 맞춤
• 주의해야 할 주어:
  - 집합명사: "The team is/are..." (미국식 단수 / 영국식 복수 가능)
  - 고유명사: "The United States is..." (나라는 단수)
  - 학문/병명: "Mathematics is...", "Measles is..."
  - "A number of + 복수명사" → 복수 동사
  - "The number of + 복수명사" → 단수 동사
• 상관접속사 수 일치:
  - both A and B → 복수
  - either A or B / neither A nor B → B에 일치
• each/every/any + 단수명사 → 단수 동사
  - "Every student is present."
• 부분/분수 + of + 명사: 명사의 수에 일치
  - "Half of the students are here." / "Half of the water is gone."
• There is/are 구문: 뒤에 오는 명사의 수에 일치
  - "There are many books." / "There is a book."
• 관계절의 동사: 선행사의 수에 일치`,
    },
    {
      day: 29,
      topic: '시제 일치와 화법 전환',
      content: `시제 일치 규칙과 직접화법/간접화법 전환
• 시제 일치: 주절이 과거 → 종속절도 과거(또는 과거완료)
  - "She said she was busy." (주절: said → 종속절: was)
  - "He thought she had left." (과거보다 더 이전)
• 시제 일치 예외: 불변의 사실, 현재에도 사실인 것
  - "He said the Earth revolves around the Sun."
• 직접화법 → 간접화법 전환:
  평서문: say/tell + that + 시제 변환
  - "She said, 'I am tired.'" → "She said (that) she was tired."
  의문문: ask/wonder + if/whether 또는 의문사
  - "He asked, 'Where do you live?'" → "He asked where I lived."
  명령문: tell/ask/order/beg + to-V / not to-V
  - "She said, 'Please be quiet.'" → "She asked me to be quiet."
• 인칭대명사, 지시어, 시간/장소 부사 변환:
  - I → he/she / this → that / here → there / now → then
  - yesterday → the day before / tomorrow → the next day`,
    },
    {
      day: 30,
      topic: '핵심 문법 총복습',
      content: `30일 영어 문법 완전 정복 총정리
• 문장 형식: 5형식(S+V, S+V+C, S+V+O, S+V+IO+DO, S+V+O+OC)
• 품사: 명사·대명사·동사·형용사·부사·전치사·접속사·감탄사
• 시제: 단순/진행/완료 × 현재/과거/미래 = 9시제 체계
• 조동사: can/may/must/should + 과거추측 조동사 + have p.p.
• 수동태: be + p.p., 시제별 수동태
• 준동사: to부정사(명사·형용사·부사), 동명사, 분사(현재/과거), 분사구문
• 비교: 원급(as~as), 비교급(-er/more~than), 최상급(the~est/the most)
• 전치사: 시간(at/in/on/for/since), 장소(at/in/on), 방향
• 접속사: 등위(FANBOYS), 상관, 종속(시간/이유/조건/양보/목적)
• 관계사: 관계대명사(who/which/that/what), 관계부사(when/where/why/how)
• 절의 종류: 명사절(that/의문사/if·whether), 부사절, 형용사절
• 가정법: 현재(가능)/과거(현재반대)/과거완료(과거반대) + I wish
• 특수구문: 도치, 강조(It is~that), 수 일치, 시제 일치, 화법 전환`,
    },
  ],
};

const CURRICULA: Record<string, Curriculum> = {
  english_grammar: ENGLISH_GRAMMAR_CURRICULUM,
};

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA[id];
}

export function getCurriculumDay(curriculumId: string, dayNum: number): CurriculumDay | undefined {
  const curriculum = CURRICULA[curriculumId];
  if (!curriculum) return undefined;
  const idx = Math.min(dayNum, curriculum.totalDays) - 1;
  return curriculum.days[idx];
}
