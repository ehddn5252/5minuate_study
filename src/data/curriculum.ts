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

const ENGLISH_VOCAB_CURRICULUM: Curriculum = {
  id: 'english_vocab',
  name: '영어단어 매일',
  totalDays: 30,
  days: [
    {
      day: 1,
      topic: '기초 동사 1 - 일상 행동',
      content: `일상에서 자주 쓰는 기본 동사 10개
• achieve (v) 성취하다 — "She achieved her goal."
• accomplish (v) 해내다 — "He accomplished the task on time."
• arrange (v) 준비하다, 배열하다 — "Let's arrange a meeting."
• assist (v) 돕다 — "Can you assist me with this?"
• borrow (v) 빌리다 — "May I borrow your pen?"
• complete (v) 완료하다 — "I completed my homework."
• deliver (v) 배달하다, 전달하다 — "They deliver food quickly."
• examine (v) 조사하다, 검사하다 — "The doctor examined the patient."
• gather (v) 모으다 — "We gathered information for the report."
• maintain (v) 유지하다 — "It's hard to maintain good habits."`,
    },
    {
      day: 2,
      topic: '기초 동사 2 - 사고와 감정',
      content: `생각과 판단을 나타내는 동사 10개
• assume (v) 추측하다, 가정하다 — "I assume you're right."
• believe (v) 믿다 — "I believe in her ability."
• consider (v) 고려하다 — "Please consider my opinion."
• doubt (v) 의심하다 — "I doubt he will come."
• expect (v) 예상하다, 기대하다 — "We expect good results."
• imagine (v) 상상하다 — "Imagine a world without conflict."
• recognize (v) 알아보다, 인정하다 — "I recognized her voice."
• regret (v) 후회하다 — "He regrets his decision."
• suppose (v) 추정하다 — "I suppose you're tired."
• realize (v) 깨닫다 — "I realized my mistake."`,
    },
    {
      day: 3,
      topic: '기본 형용사 - 성질과 상태',
      content: `사물의 성질과 상태를 나타내는 형용사 10개
• ancient (adj) 고대의 — "an ancient civilization"
• brief (adj) 간단한, 짧은 — "a brief explanation"
• complex (adj) 복잡한 — "a complex problem"
• essential (adj) 필수적인 — "Water is essential for life."
• fragile (adj) 부서지기 쉬운 — "Handle the glass carefully; it's fragile."
• gradual (adj) 점진적인 — "a gradual change"
• immense (adj) 거대한, 엄청난 — "an immense amount of work"
• ordinary (adj) 평범한 — "an ordinary day"
• precise (adj) 정확한 — "Give me the precise time."
• vivid (adj) 생생한 — "a vivid memory"`,
    },
    {
      day: 4,
      topic: '감정을 나타내는 단어',
      content: `감정과 심리 상태를 나타내는 형용사 10개
• anxious (adj) 불안한 — "She felt anxious before the exam."
• ashamed (adj) 부끄러운 — "He was ashamed of his mistake."
• curious (adj) 호기심 많은 — "The child was curious about everything."
• eager (adj) 열망하는 — "She was eager to learn."
• furious (adj) 몹시 화난 — "He was furious about the delay."
• grateful (adj) 감사하는 — "I'm grateful for your help."
• jealous (adj) 질투하는 — "He felt jealous of his friend."
• nervous (adj) 긴장한 — "I was nervous before the interview."
• relieved (adj) 안도한 — "She felt relieved after the test."
• sorrowful (adj) 슬픈 — "a sorrowful expression"`,
    },
    {
      day: 5,
      topic: '사람과 관계',
      content: `사람과 인간관계를 나타내는 단어 10개
• acquaintance (n) 아는 사람, 지인 — "He's just an acquaintance, not a close friend."
• colleague (n) 동료 — "My colleague helped me with the project."
• companion (n) 동반자 — "a travel companion"
• generation (n) 세대 — "the younger generation"
• neighbor (n) 이웃 — "My neighbor is very kind."
• relative (n) 친척 — "I have relatives in Busan."
• sibling (n) 형제자매 — "I have two siblings."
• spouse (n) 배우자 — "Bring your spouse to the party."
• stranger (n) 낯선 사람 — "Don't talk to strangers."
• teenager (n) 십대 — "Many teenagers use social media."`,
    },
    {
      day: 6,
      topic: '학교와 공부',
      content: `학업과 관련된 단어 10개
• academic (adj) 학업의 — "academic performance"
• assignment (n) 과제 — "Submit your assignment by Friday."
• curriculum (n) 교육과정 — "a new school curriculum"
• discipline (n) 훈육, 규율 — "self-discipline"
• elementary (adj) 초등의, 기초적인 — "elementary school"
• graduate (v) 졸업하다 — "She will graduate next year."
• lecture (n) 강의 — "attend a lecture"
• literacy (n) 읽고 쓰는 능력, 문해력 — "digital literacy"
• scholarship (n) 장학금 — "He received a scholarship."
• semester (n) 학기 — "the spring semester"`,
    },
    {
      day: 7,
      topic: '시간과 빈도',
      content: `시간의 흐름과 빈도를 나타내는 부사 10개
• constantly (adv) 끊임없이 — "He's constantly checking his phone."
• eventually (adv) 결국 — "She eventually succeeded."
• frequently (adv) 자주 — "They frequently visit their grandparents."
• gradually (adv) 점차 — "The weather is gradually improving."
• immediately (adv) 즉시 — "Call me immediately."
• occasionally (adv) 가끔 — "I occasionally eat out."
• permanently (adv) 영구적으로 — "The shop closed permanently."
• previously (adv) 이전에 — "As previously mentioned..."
• rarely (adv) 드물게 — "He rarely gets angry."
• temporarily (adv) 일시적으로 — "The road is temporarily closed."`,
    },
    {
      day: 8,
      topic: '장소와 이동',
      content: `장소와 이동을 나타내는 단어 10개
• boundary (n) 경계 — "the boundary between two countries"
• destination (n) 목적지 — "Our destination is Seoul."
• journey (n) 여행, 여정 — "a long journey"
• migrate (v) 이주하다 — "Birds migrate south in winter."
• nearby (adj/adv) 근처의, 근처에 — "a nearby restaurant"
• region (n) 지역 — "a mountainous region"
• route (n) 경로 — "the shortest route"
• suburb (n) 교외 — "They live in the suburbs."
• territory (n) 영토 — "protect one's territory"
• vehicle (n) 차량 — "an electric vehicle"`,
    },
    {
      day: 9,
      topic: '자연과 날씨',
      content: `자연 현상과 날씨를 나타내는 단어 10개
• atmosphere (n) 대기, 분위기 — "the Earth's atmosphere"
• climate (n) 기후 — "a dry climate"
• drought (n) 가뭄 — "a severe drought"
• humid (adj) 습한 — "hot and humid weather"
• moisture (n) 습기, 수분 — "The soil needs moisture."
• rainfall (n) 강우량 — "heavy rainfall"
• temperature (n) 온도, 기온 — "rising temperatures"
• thunder (n) 천둥 — "thunder and lightning"
• vegetation (n) 초목, 식생 — "dense vegetation"
• wildlife (n) 야생동물 — "protect wildlife"`,
    },
    {
      day: 10,
      topic: '동물과 식물',
      content: `생물과 관련된 단어 10개
• creature (n) 생물 — "a strange creature"
• endangered (adj) 멸종 위기의 — "an endangered species"
• habitat (n) 서식지 — "the natural habitat of tigers"
• insect (n) 곤충 — "insects like bees and ants"
• mammal (n) 포유류 — "Whales are mammals."
• nutrient (n) 영양소 — "nutrients in soil"
• organism (n) 유기체 — "living organisms"
• predator (n) 포식자 — "a natural predator"
• species (n) 종(種) — "an endangered species"
• breed (n/v) 품종, 사육하다 — "a rare breed of dog"`,
    },
    {
      day: 11,
      topic: '사회와 공동체',
      content: `사회와 공동체를 나타내는 단어 10개
• community (n) 공동체 — "a local community"
• culture (n) 문화 — "traditional culture"
• custom (n) 관습 — "a local custom"
• diversity (n) 다양성 — "cultural diversity"
• ethnic (adj) 민족의 — "ethnic groups"
• institution (n) 기관 — "an educational institution"
• minority (n) 소수 집단 — "protect minority rights"
• norm (n) 규범 — "social norms"
• tradition (n) 전통 — "a family tradition"
• welfare (n) 복지 — "social welfare"`,
    },
    {
      day: 12,
      topic: '경제와 소비',
      content: `경제와 소비 활동을 나타내는 단어 10개
• budget (n) 예산 — "a tight budget"
• commerce (n) 상업 — "electronic commerce"
• consumer (n) 소비자 — "consumer rights"
• currency (n) 화폐 — "foreign currency"
• economy (n) 경제 — "a growing economy"
• expense (n) 비용 — "living expenses"
• income (n) 소득 — "monthly income"
• investment (n) 투자 — "a wise investment"
• profit (n) 이익 — "make a profit"
• revenue (n) 수익, 세입 — "annual revenue"`,
    },
    {
      day: 13,
      topic: '과학과 기술',
      content: `과학과 기술 관련 단어 10개
• artificial (adj) 인공의 — "artificial intelligence"
• device (n) 기기 — "an electronic device"
• innovation (n) 혁신 — "technological innovation"
• invention (n) 발명 — "a useful invention"
• mechanism (n) 메커니즘, 장치 — "a defense mechanism"
• molecule (n) 분자 — "water molecules"
• technology (n) 기술 — "modern technology"
• theory (n) 이론 — "a scientific theory"
• laboratory (n) 실험실 — "work in a laboratory"
• digital (adj) 디지털의 — "digital devices"`,
    },
    {
      day: 14,
      topic: '건강과 신체',
      content: `건강과 신체 관련 단어 10개
• symptom (n) 증상 — "symptoms of a cold"
• treatment (n) 치료 — "medical treatment"
• nutrition (n) 영양 — "good nutrition"
• disease (n) 질병 — "prevent disease"
• immune (adj) 면역의 — "the immune system"
• injury (n) 부상 — "a serious injury"
• medication (n) 약물 — "take medication"
• therapy (n) 치료법 — "physical therapy"
• vitamin (n) 비타민 — "vitamin C"
• fatigue (n) 피로 — "suffer from fatigue"`,
    },
    {
      day: 15,
      topic: '예술과 문화',
      content: `예술과 문화 관련 단어 10개
• aesthetic (adj) 미적인 — "aesthetic value"
• exhibit (v/n) 전시하다, 전시 — "an art exhibit"
• heritage (n) 유산 — "cultural heritage"
• masterpiece (n) 걸작 — "a literary masterpiece"
• sculpture (n) 조각 — "a bronze sculpture"
• literature (n) 문학 — "classic literature"
• melody (n) 멜로디 — "a beautiful melody"
• portrait (n) 초상화 — "paint a portrait"
• artistic (adj) 예술적인 — "artistic talent"
• creativity (n) 창의성 — "encourage creativity"`,
    },
    {
      day: 16,
      topic: '정치와 법',
      content: `정치와 법 관련 단어 10개
• authority (n) 권위, 당국 — "government authority"
• campaign (n) 캠페인 — "an election campaign"
• congress (n) 의회 — "pass a bill in congress"
• democracy (n) 민주주의 — "a modern democracy"
• legislation (n) 법률, 입법 — "new legislation"
• policy (n) 정책 — "economic policy"
• regulation (n) 규정 — "safety regulations"
• election (n) 선거 — "a presidential election"
• justice (n) 정의 — "social justice"
• violation (n) 위반 — "a violation of the law"`,
    },
    {
      day: 17,
      topic: '역사와 전통',
      content: `역사와 전통 관련 단어 10개
• ancestor (n) 조상 — "our ancestors"
• civilization (n) 문명 — "ancient civilization"
• dynasty (n) 왕조 — "the Joseon dynasty"
• era (n) 시대 — "a new era"
• legacy (n) 유산 — "leave a legacy"
• monument (n) 기념물 — "a historic monument"
• myth (n) 신화 — "a Greek myth"
• ritual (n) 의식 — "a traditional ritual"
• historic (adj) 역사적인 — "a historic event"
• chronicle (n/v) 연대기, 기록하다 — "chronicle the events"`,
    },
    {
      day: 18,
      topic: '심리와 성격',
      content: `성격을 나타내는 형용사 10개
• arrogant (adj) 거만한 — "an arrogant attitude"
• cautious (adj) 신중한 — "a cautious driver"
• generous (adj) 관대한 — "a generous donation"
• humble (adj) 겸손한 — "a humble person"
• optimistic (adj) 낙관적인 — "an optimistic view"
• pessimistic (adj) 비관적인 — "a pessimistic outlook"
• stubborn (adj) 고집 센 — "a stubborn child"
• sincere (adj) 진실한 — "a sincere apology"
• modest (adj) 겸손한, 적당한 — "a modest income"
• sensitive (adj) 민감한 — "a sensitive topic"`,
    },
    {
      day: 19,
      topic: '의사소통',
      content: `의사소통과 관련된 동사 10개
• articulate (v) 명확히 표현하다 — "She articulated her ideas clearly."
• convey (v) 전달하다 — "convey a message"
• persuade (v) 설득하다 — "persuade him to join"
• negotiate (v) 협상하다 — "negotiate a deal"
• emphasize (v) 강조하다 — "emphasize the importance of safety"
• imply (v) 암시하다 — "What are you implying?"
• interpret (v) 해석하다 — "interpret the data"
• clarify (v) 명확히 하다 — "Could you clarify your point?"
• elaborate (v) 상세히 설명하다 — "Could you elaborate on that?"
• express (v) 표현하다 — "express your feelings"`,
    },
    {
      day: 20,
      topic: '환경과 에너지',
      content: `환경과 에너지 관련 단어 10개
• pollution (n) 오염 — "air pollution"
• renewable (adj) 재생 가능한 — "renewable energy"
• resource (n) 자원 — "natural resources"
• sustainable (adj) 지속 가능한 — "sustainable development"
• emission (n) 배출 — "carbon emissions"
• conserve (v) 보존하다 — "conserve energy"
• ecosystem (n) 생태계 — "a fragile ecosystem"
• recycle (v) 재활용하다 — "recycle plastic bottles"
• exhaust (n/v) 배기가스, 소모시키다 — "car exhaust"
• fossil (n) 화석 — "fossil fuels"`,
    },
    {
      day: 21,
      topic: '추상적 개념 1 - 원인과 결과',
      content: `원인과 결과를 나타내는 단어 10개
• consequence (n) 결과 — "face the consequences"
• factor (n) 요인 — "a key factor"
• impact (n/v) 영향 — "a positive impact"
• outcome (n) 결과 — "a successful outcome"
• contribute (v) 기여하다, 원인이 되다 — "contribute to climate change"
• derive (v) 유래하다, 얻다 — "derive pleasure from reading"
• result (v/n) 결과로 나타나다, 결과 — "result in failure"
• trigger (v) 촉발하다 — "trigger a reaction"
• stem (v) 유래하다 — "stem from a misunderstanding"
• yield (v) 산출하다, 낳다 — "yield good results"`,
    },
    {
      day: 22,
      topic: '추상적 개념 2 - 비교와 대조',
      content: `비교와 대조를 나타내는 단어 10개
• contrast (n/v) 대조 — "in contrast to"
• distinguish (v) 구별하다 — "distinguish right from wrong"
• equivalent (adj) 동등한 — "an equivalent amount"
• resemble (v) 닮다 — "She resembles her mother."
• similarity (n) 유사성 — "a striking similarity"
• differ (v) 다르다 — "opinions differ"
• identical (adj) 동일한 — "identical twins"
• contrary (adj) 반대의 — "contrary to popular belief"
• parallel (adj/n) 평행한, 유사점 — "draw a parallel"
• contradict (v) 모순되다 — "contradict yourself"`,
    },
    {
      day: 23,
      topic: '학술 어휘 1 - 분석과 논증',
      content: `분석과 논증에 쓰이는 단어 10개
• analyze (v) 분석하다 — "analyze the data"
• assert (v) 주장하다 — "assert one's opinion"
• evaluate (v) 평가하다 — "evaluate the results"
• hypothesis (n) 가설 — "test a hypothesis"
• illustrate (v) 설명하다, 예시로 보여주다 — "illustrate the point"
• justify (v) 정당화하다 — "justify one's actions"
• argue (v) 주장하다, 논쟁하다 — "argue for change"
• evidence (n) 증거 — "strong evidence"
• criterion (n) 기준 — "the main criterion"
• valid (adj) 타당한 — "a valid argument"`,
    },
    {
      day: 24,
      topic: '학술 어휘 2 - 평가와 판단',
      content: `평가와 판단에 쓰이는 단어 10개
• assess (v) 평가하다 — "assess the situation"
• conclude (v) 결론을 내리다 — "conclude that it works"
• considerable (adj) 상당한 — "a considerable amount"
• significant (adj) 중요한, 상당한 — "a significant difference"
• presume (v) 추정하다 — "I presume you're right."
• verify (v) 확인하다 — "verify the facts"
• controversial (adj) 논란이 되는 — "a controversial topic"
• plausible (adj) 그럴듯한 — "a plausible explanation"
• credible (adj) 신뢰할 수 있는 — "a credible source"
• objective (adj/n) 객관적인, 목표 — "an objective view"`,
    },
    {
      day: 25,
      topic: '수능 고난도 동사',
      content: `수능 독해에 자주 나오는 고난도 동사 10개
• alleviate (v) 완화하다 — "alleviate poverty"
• compensate (v) 보상하다 — "compensate for the loss"
• deteriorate (v) 악화되다 — "His health deteriorated."
• enhance (v) 향상시키다 — "enhance performance"
• fluctuate (v) 변동하다 — "prices fluctuate"
• hinder (v) 방해하다 — "hinder progress"
• manipulate (v) 조작하다 — "manipulate data"
• mitigate (v) 완화시키다 — "mitigate the risk"
• reinforce (v) 강화하다 — "reinforce the argument"
• undermine (v) 약화시키다 — "undermine confidence"`,
    },
    {
      day: 26,
      topic: '수능 고난도 형용사',
      content: `수능 독해에 자주 나오는 고난도 형용사 10개
• ambiguous (adj) 모호한 — "an ambiguous statement"
• arbitrary (adj) 임의의 — "an arbitrary decision"
• coherent (adj) 일관성 있는 — "a coherent argument"
• inevitable (adj) 불가피한 — "an inevitable result"
• meticulous (adj) 꼼꼼한 — "meticulous planning"
• notorious (adj) 악명 높은 — "notorious for crime"
• redundant (adj) 불필요한, 중복된 — "redundant information"
• subtle (adj) 미묘한 — "a subtle difference"
• tangible (adj) 실재하는, 명백한 — "tangible benefits"
• versatile (adj) 다재다능한 — "a versatile actor"`,
    },
    {
      day: 27,
      topic: '관용표현·구동사 1',
      content: `자주 쓰이는 구동사 10개
• bring about 초래하다 — "bring about change"
• carry out 수행하다 — "carry out a plan"
• come up with (아이디어를) 생각해내다 — "come up with a solution"
• deal with 다루다, 처리하다 — "deal with a problem"
• figure out 알아내다 — "figure out the answer"
• give up 포기하다 — "give up smoking"
• look into 조사하다 — "look into the matter"
• make up for 보상하다, 만회하다 — "make up for lost time"
• put off 미루다 — "put off the meeting"
• take over 인수하다, 넘겨받다 — "take over the company"`,
    },
    {
      day: 28,
      topic: '관용표현·구동사 2',
      content: `자주 쓰이는 구동사 10개
• account for 설명하다, 차지하다 — "account for the difference"
• break down 고장 나다, 분석하다 — "The car broke down."
• catch up with ~을 따라잡다 — "catch up with the trend"
• come across 우연히 마주치다 — "come across an old photo"
• get over 극복하다 — "get over an illness"
• hold on to ~을 붙잡다, 고수하다 — "hold on to your beliefs"
• keep up with ~에 뒤처지지 않다 — "keep up with the news"
• rely on ~에 의존하다 — "rely on public transport"
• run out of ~이 바닥나다 — "run out of time"
• turn out ~로 판명되다 — "It turned out to be true."`,
    },
    {
      day: 29,
      topic: '다의어 - 문맥별 의미',
      content: `문맥에 따라 뜻이 달라지는 단어 10개
• address (n/v) 주소, 다루다/연설하다 — "address the issue"
• book (n/v) 책, 예약하다 — "book a hotel room"
• fine (adj/n) 좋은, 벌금 — "pay a fine"
• issue (n/v) 문제, 발행하다 — "a controversial issue"
• mean (v/adj) 의미하다, 인색한 — "What does this word mean?"
• novel (n/adj) 소설, 참신한 — "a novel idea"
• plant (n/v) 식물, 공장, 심다 — "a power plant"
• right (adj/n) 옳은, 권리 — "human rights"
• subject (n/adj) 주제, 과목, ~하기 쉬운 — "the subject of the essay"
• matter (n/v) 문제, 중요하다 — "It doesn't matter."`,
    },
    {
      day: 30,
      topic: '수능 최고난도 어휘 총정리',
      content: `수능 최고난도 어휘 10개 - 지금까지 배운 내용 총정리
• eloquent (adj) 웅변적인, 설득력 있는 — "an eloquent speech"
• exemplify (v) 예시하다, 전형적인 예가 되다 — "This case exemplifies the problem."
• formidable (adj) 만만찮은, 강력한 — "a formidable opponent"
• indispensable (adj) 필수불가결한 — "an indispensable tool"
• paradox (n) 역설 — "a strange paradox"
• quintessential (adj) 전형적인, 본질적인 — "the quintessential example"
• scrutinize (v) 면밀히 조사하다 — "scrutinize the details"
• ubiquitous (adj) 어디에나 있는 — "smartphones are ubiquitous"
• unprecedented (adj) 전례 없는 — "unprecedented growth"
• viable (adj) 실행 가능한 — "a viable option"`,
    },
  ],
};

const ENGLISH_WRITING_CURRICULUM: Curriculum = {
  id: 'english_writing',
  name: '영작 매일',
  totalDays: 30,
  days: [
    {
      day: 1,
      topic: '기본 문장 구조 (S+V, S+V+O) 영작',
      content: `한국어 문장을 영어 기본 어순(주어+동사)으로 옮기기
• 새가 노래한다. → The bird sings.
• 나는 음악을 좋아한다. → I like music.
• 그녀는 매일 달린다. → She runs every day.
• 우리는 책을 읽는다. → We read books.
• 그는 커피를 마신다. → He drinks coffee.
• 아이들이 논다. → The children play.
• 나는 학교에 간다. → I go to school.
• 그들은 영어를 공부한다. → They study English.`,
    },
    {
      day: 2,
      topic: 'be동사 문장 영작',
      content: `상태·신분을 나타내는 be동사 문장 영작
• 나는 학생이다. → I am a student.
• 그는 의사다. → He is a doctor.
• 그녀는 행복하다. → She is happy.
• 우리는 친구다. → We are friends.
• 그것은 크다. → It is big.
• 날씨가 춥다. → It is cold.
• 그들은 바쁘다. → They are busy.
• 나는 피곤하다. → I am tired.`,
    },
    {
      day: 3,
      topic: '현재시제 문장 영작 (습관·사실)',
      content: `반복되는 습관이나 일반적 사실을 현재시제로 영작
• 나는 매일 아침 7시에 일어난다. → I wake up at 7 every morning.
• 그는 주말마다 축구를 한다. → He plays soccer every weekend.
• 태양은 동쪽에서 뜬다. → The sun rises in the east.
• 그녀는 커피를 좋아하지 않는다. → She doesn't like coffee.
• 우리는 보통 버스를 탄다. → We usually take the bus.
• 물은 100도에서 끓는다. → Water boils at 100 degrees.
• 그는 세 개의 언어를 구사한다. → He speaks three languages.
• 나는 채식주의자다. → I am a vegetarian.`,
    },
    {
      day: 4,
      topic: '과거시제 문장 영작',
      content: `이미 끝난 일을 과거시제로 영작 (규칙·불규칙 동사)
• 나는 어제 학교에 갔다. → I went to school yesterday.
• 그녀는 지난주에 책을 샀다. → She bought a book last week.
• 우리는 영화를 봤다. → We watched a movie.
• 그는 늦게 도착했다. → He arrived late.
• 나는 아침을 먹지 않았다. → I didn't eat breakfast.
• 그들은 파티에 갔다. → They went to the party.
• 나는 그 소식을 들었다. → I heard the news.
• 그녀는 편지를 썼다. → She wrote a letter.`,
    },
    {
      day: 5,
      topic: '미래시제 문장 영작 (will / be going to)',
      content: `앞으로 일어날 일을 will과 be going to로 영작
• 나는 내일 그를 만날 것이다. → I will meet him tomorrow.
• 우리는 다음 달에 여행을 갈 것이다. → We are going to travel next month.
• 그녀는 곧 도착할 것이다. → She will arrive soon.
• 나는 그 일을 끝낼 계획이다. → I am going to finish the work.
• 내일 비가 올 것이다. → It will rain tomorrow.
• 그는 새 차를 살 것이다. → He is going to buy a new car.
• 우리는 절대 포기하지 않을 것이다. → We will never give up.
• 나는 다음 주에 이사할 것이다. → I am going to move next week.`,
    },
    {
      day: 6,
      topic: '의문문 영작',
      content: `평서문을 의문문으로 바꿔 영작하기
• 너는 학생이니? → Are you a student?
• 그는 커피를 마시니? → Does he drink coffee?
• 그녀는 어제 왔니? → Did she come yesterday?
• 너는 무엇을 좋아하니? → What do you like?
• 그는 어디에 사니? → Where does he live?
• 왜 늦었니? → Why were you late?
• 이것은 누구의 책이니? → Whose book is this?
• 회의가 몇 시에 시작하니? → What time does the meeting start?`,
    },
    {
      day: 7,
      topic: '부정문 영작',
      content: `not, never, no 등을 활용한 부정문 영작
• 나는 육류를 먹지 않는다. → I don't eat meat.
• 그는 거짓말을 하지 않는다. → He doesn't tell lies.
• 그녀는 결코 늦지 않는다. → She never comes late.
• 우리는 아직 결정하지 않았다. → We haven't decided yet.
• 그것은 사실이 아니다. → That is not true.
• 나는 아무것도 몰랐다. → I knew nothing about it.
• 그는 아무도 만나지 않았다. → He didn't meet anyone.
• 시간이 충분하지 않다. → There isn't enough time.`,
    },
    {
      day: 8,
      topic: '조동사 문장 영작 (can/must/should)',
      content: `가능·의무·충고를 나타내는 조동사 문장 영작
• 나는 수영할 수 있다. → I can swim.
• 너는 이 규칙을 지켜야 한다. → You must follow this rule.
• 너는 의사를 만나보는 게 좋겠다. → You should see a doctor.
• 제가 들어가도 될까요? → May I come in?
• 그는 곧 도착할지도 모른다. → He might arrive soon.
• 우리는 여기서 주차하면 안 된다. → We must not park here.
• 너는 그럴 필요 없다. → You don't have to do that.
• 제가 창문을 열어도 될까요? → Could I open the window?`,
    },
    {
      day: 9,
      topic: '형용사로 묘사하는 문장 영작',
      content: `사람·사물의 성질을 형용사로 묘사하는 영작
• 이 영화는 정말 흥미롭다. → This movie is very interesting.
• 그녀는 친절하고 똑똑하다. → She is kind and smart.
• 그 상자는 무겁다. → The box is heavy.
• 날씨가 맑고 따뜻하다. → The weather is clear and warm.
• 그는 자신의 실수를 부끄러워했다. → He was ashamed of his mistake.
• 이 문제는 복잡하다. → This problem is complex.
• 그 소식은 놀라웠다. → The news was surprising.
• 그녀의 방은 항상 깨끗하다. → Her room is always clean.`,
    },
    {
      day: 10,
      topic: '부사로 꾸미는 문장 영작',
      content: `동사·형용사를 부사로 수식하는 영작
• 그는 빨리 달린다. → He runs quickly.
• 그녀는 조용히 말했다. → She spoke quietly.
• 나는 그것을 완전히 이해한다. → I completely understand it.
• 우리는 마침내 도착했다. → We finally arrived.
• 그는 매우 열심히 일한다. → He works very hard.
• 그녀는 항상 제시간에 온다. → She always comes on time.
• 나는 그 소식을 방금 들었다. → I just heard the news.
• 그것은 거의 불가능하다. → It is almost impossible.`,
    },
    {
      day: 11,
      topic: '전치사구 활용 문장 영작',
      content: `시간·장소 전치사구를 넣어 문장 영작
• 나는 아침에 커피를 마신다. → I drink coffee in the morning.
• 책이 탁자 위에 있다. → The book is on the table.
• 우리는 3시에 만날 것이다. → We will meet at 3 o'clock.
• 그녀는 서울에 산다. → She lives in Seoul.
• 그는 월요일부터 일한다. → He works from Monday.
• 고양이가 상자 안에 있다. → The cat is in the box.
• 나는 저녁까지 기다렸다. → I waited until evening.
• 그 다리는 강 위에 있다. → The bridge is over the river.`,
    },
    {
      day: 12,
      topic: '접속사로 문장 연결하기 (and/but/because)',
      content: `등위·종속 접속사로 두 문장을 하나로 연결하는 영작
• 나는 피곤했지만 계속 일했다. → I was tired, but I kept working.
• 비가 와서 우리는 집에 있었다. → We stayed home because it rained.
• 그는 똑똑하고 부지런하다. → He is smart and diligent.
• 나는 배가 고파서 샌드위치를 먹었다. → I ate a sandwich because I was hungry.
• 서두르지 않으면 늦을 것이다. → If you don't hurry, you will be late.
• 그녀는 노래하면서 요리했다. → She cooked while singing.
• 나는 돈이 없어서 그것을 살 수 없다. → I can't buy it because I have no money.
• 비록 어렵지만 나는 최선을 다할 것이다. → Although it is hard, I will do my best.`,
    },
    {
      day: 13,
      topic: '비교급·최상급 문장 영작',
      content: `두 대상 이상을 비교하는 문장 영작
• 이것이 저것보다 크다. → This is bigger than that.
• 그녀는 반에서 가장 똑똑하다. → She is the smartest in the class.
• 오늘은 어제보다 춥다. → Today is colder than yesterday.
• 이것은 세상에서 가장 비싼 차다. → This is the most expensive car in the world.
• 그는 나보다 더 빨리 달린다. → He runs faster than me.
• 시간이 돈보다 중요하다. → Time is more important than money.
• 이 책이 저 책만큼 재미있다. → This book is as interesting as that one.
• 그것이 최선의 선택이었다. → It was the best choice.`,
    },
    {
      day: 14,
      topic: 'to부정사 활용 문장 영작',
      content: `목적·의도를 to부정사로 표현하는 영작
• 나는 영어를 배우고 싶다. → I want to learn English.
• 그는 시험에 합격하기 위해 열심히 공부했다. → He studied hard to pass the exam.
• 그녀는 책을 읽을 시간이 없다. → She has no time to read books.
• 나는 무엇을 해야 할지 모르겠다. → I don't know what to do.
• 그것은 이해하기 어렵다. → It is difficult to understand.
• 우리는 일찍 떠나기로 결정했다. → We decided to leave early.
• 그는 새 직장을 구하기를 희망한다. → He hopes to find a new job.
• 물을 마시는 것은 건강에 좋다. → To drink water is good for health.`,
    },
    {
      day: 15,
      topic: '동명사 활용 문장 영작',
      content: `동사를 명사처럼 쓰는 동명사 문장 영작
• 나는 영화 보는 것을 즐긴다. → I enjoy watching movies.
• 수영은 좋은 운동이다. → Swimming is good exercise.
• 그는 담배를 끊었다. → He gave up smoking.
• 그녀는 노래하는 것을 좋아한다. → She likes singing.
• 계속 연습하는 것이 중요하다. → Keeping practicing is important.
• 나는 그를 만난 것을 기억한다. → I remember meeting him.
• 그는 늦은 것에 대해 사과했다. → He apologized for being late.
• 책을 읽는 것은 시야를 넓혀준다. → Reading books broadens your view.`,
    },
    {
      day: 16,
      topic: '분사 활용 문장 영작 (현재분사/과거분사)',
      content: `-ing, -ed 형태로 명사를 꾸미는 분사 문장 영작
• 저기서 웃고 있는 소녀는 내 동생이다. → The girl laughing over there is my sister.
• 이것은 한국에서 만들어진 제품이다. → This is a product made in Korea.
• 나는 그 지루한 영화를 봤다. → I watched the boring movie.
• 그는 그 소식에 놀랐다. → He was surprised at the news.
• 창문에서 자고 있는 고양이를 봐. → Look at the cat sleeping by the window.
• 깨진 유리를 조심해라. → Be careful of the broken glass.
• 그녀는 흥분한 목소리로 말했다. → She spoke in an excited voice.
• 그 영화는 매우 지루했다. → The movie was very boring.`,
    },
    {
      day: 17,
      topic: '현재완료 문장 영작',
      content: `have/has + p.p.로 경험·완료·결과·계속을 표현하는 영작
• 나는 파리에 가본 적이 있다. → I have been to Paris.
• 그녀는 방금 숙제를 끝냈다. → She has just finished her homework.
• 그는 열쇠를 잃어버렸다(지금도 없음). → He has lost his key.
• 우리는 10년 동안 서로 알아왔다. → We have known each other for ten years.
• 나는 아직 저녁을 안 먹었다. → I haven't eaten dinner yet.
• 너는 그 영화를 본 적이 있니? → Have you ever seen that movie?
• 그는 이미 떠났다. → He has already left.
• 나는 이 도시에 5년째 살고 있다. → I have lived in this city for five years.`,
    },
    {
      day: 18,
      topic: '수동태 문장 영작',
      content: `be + p.p. 구조로 수동태 문장 영작
• 이 집은 1990년에 지어졌다. → This house was built in 1990.
• 그 편지는 그녀에 의해 쓰였다. → The letter was written by her.
• 영어는 전 세계에서 사용된다. → English is spoken all over the world.
• 그 문제는 아직 해결되지 않았다. → The problem hasn't been solved yet.
• 그 책은 많은 언어로 번역되었다. → The book was translated into many languages.
• 창문이 깨졌다. → The window was broken.
• 그 회의는 취소될 것이다. → The meeting will be canceled.
• 그 도시는 지진으로 파괴되었다. → The city was destroyed by the earthquake.`,
    },
    {
      day: 19,
      topic: '4형식(수여동사) 문장 영작',
      content: `~에게 ~을 주다 구조를 수여동사로 영작
• 그는 나에게 선물을 주었다. → He gave me a gift.
• 그녀는 우리에게 이야기를 들려주었다. → She told us a story.
• 나는 그에게 이메일을 보냈다. → I sent him an email.
• 선생님은 학생들에게 영어를 가르친다. → The teacher teaches students English.
• 그는 나에게 질문을 했다. → He asked me a question.
• 그녀는 나에게 케이크를 만들어줬다. → She made me a cake.
• 아버지는 나에게 시계를 사주셨다. → My father bought me a watch.
• 그는 나에게 진실을 보여주었다. → He showed me the truth.`,
    },
    {
      day: 20,
      topic: '5형식(목적격보어) 문장 영작',
      content: `목적어를 보충 설명하는 5형식 문장 영작
• 우리는 그를 천재라고 부른다. → We call him a genius.
• 그것은 나를 행복하게 만들었다. → It made me happy.
• 나는 그 책이 흥미롭다고 생각한다. → I found the book interesting.
• 그들은 그녀를 반장으로 뽑았다. → They elected her class president.
• 나는 그가 떠나는 것을 봤다. → I saw him leave.
• 선생님은 우리가 조용히 하게 했다. → The teacher made us be quiet.
• 나는 그녀가 노래하는 것을 들었다. → I heard her sing.
• 그는 나를 도와달라고 부탁했다. → He asked me to help him.`,
    },
    {
      day: 21,
      topic: '관계대명사 문장 영작 (who/which/that)',
      content: `두 문장을 관계대명사로 연결하는 영작
• 나는 영어를 가르치는 선생님을 안다. → I know a teacher who teaches English.
• 이것은 내가 어제 산 책이다. → This is the book which I bought yesterday.
• 저기 서 있는 남자는 내 삼촌이다. → The man who is standing there is my uncle.
• 그것은 내가 찾던 정보다. → It is the information that I was looking for.
• 나는 파란 눈을 가진 소녀를 만났다. → I met a girl whose eyes are blue.
• 그가 쓴 소설은 유명하다. → The novel that he wrote is famous.
• 그것은 내가 가장 좋아하는 노래다. → It is the song which I like the most.
• 나는 도움이 필요한 사람들을 돕는다. → I help people who need help.`,
    },
    {
      day: 22,
      topic: '관계부사 문장 영작 (when/where/why/how)',
      content: `시간·장소·이유·방법을 관계부사로 연결하는 영작
• 나는 그가 태어난 해를 기억한다. → I remember the year when he was born.
• 이곳은 내가 자란 곳이다. → This is the place where I grew up.
• 나는 그가 늦은 이유를 모른다. → I don't know the reason why he was late.
• 그것이 내가 그것을 만든 방법이다. → That is how I made it.
• 그가 떠난 날은 비가 왔다. → It rained on the day when he left.
• 우리가 처음 만난 곳은 도서관이었다. → The place where we first met was the library.
• 나는 그가 성공한 이유가 궁금하다. → I wonder why he succeeded.
• 그것이 일이 진행된 방식이다. → That is how things happened.`,
    },
    {
      day: 23,
      topic: '명사절 문장 영작 (that/whether/의문사)',
      content: `문장 전체를 명사처럼 쓰는 명사절 영작
• 나는 그가 옳다고 생각한다. → I think that he is right.
• 그가 올지 안 올지 모르겠다. → I don't know whether he will come.
• 중요한 것은 네가 최선을 다했다는 것이다. → What matters is that you did your best.
• 나는 그녀가 어디 사는지 안다. → I know where she lives.
• 문제는 우리가 시간이 없다는 것이다. → The problem is that we have no time.
• 나는 그가 왜 화났는지 궁금하다. → I wonder why he is angry.
• 사실은 내가 그것을 몰랐다는 것이다. → The fact is that I didn't know it.
• 나는 그것이 사실인지 확신할 수 없다. → I am not sure if it is true.`,
    },
    {
      day: 24,
      topic: '부사절 문장 영작 (시간·이유·조건·양보)',
      content: `시간·이유·조건·양보를 나타내는 부사절 영작
• 내가 집에 도착했을 때 비가 오고 있었다. → When I arrived home, it was raining.
• 그는 아파서 결석했다. → He was absent because he was sick.
• 만약 내일 비가 오면 우리는 집에 있을 것이다. → If it rains tomorrow, we will stay home.
• 비록 그는 어리지만 매우 현명하다. → Although he is young, he is very wise.
• 그녀가 도착할 때까지 나는 기다릴 것이다. → I will wait until she arrives.
• 나는 늦었기 때문에 택시를 탔다. → Since I was late, I took a taxi.
• 그가 서두르지 않으면 기차를 놓칠 것이다. → Unless he hurries, he will miss the train.
• 그녀는 피곤했지만 계속 일했다. → Even though she was tired, she kept working.`,
    },
    {
      day: 25,
      topic: '간접의문문 영작',
      content: `의문문을 문장 속에 자연스럽게 넣는 간접의문문 영작
• 그가 몇 시에 오는지 아세요? → Do you know what time he is coming?
• 나는 그녀가 누구인지 모른다. → I don't know who she is.
• 그것이 얼마인지 말해줄 수 있나요? → Can you tell me how much it is?
• 나는 그가 왜 떠났는지 궁금하다. → I wonder why he left.
• 그녀가 어디 사는지 아세요? → Do you know where she lives?
• 나는 무엇을 해야 할지 모르겠다. → I don't know what I should do.
• 그것이 사실인지 아닌지 나는 모른다. → I don't know if it is true or not.
• 그가 왜 그렇게 말했는지 이해가 안 된다. → I can't understand why he said that.`,
    },
    {
      day: 26,
      topic: '가정법 과거 문장 영작 (현재 사실 반대)',
      content: `현재 사실과 반대되는 상황을 가정하는 영작
• 내가 새라면 날 수 있을 텐데. → If I were a bird, I could fly.
• 내가 돈이 많다면 세계 여행을 할 텐데. → If I had a lot of money, I would travel the world.
• 그가 여기 있다면 도와줄 텐데. → If he were here, he would help us.
• 시간이 있다면 너와 함께 갈 텐데. → If I had time, I would go with you.
• 내가 너라면 그렇게 하지 않을 텐데. → If I were you, I wouldn't do that.
• 그녀가 안다면 화낼 텐데. → If she knew, she would be angry.
• 시간이 더 있으면 좋을 텐데. → I wish I had more time.
• 그가 더 신중하면 좋을 텐데. → I wish he were more careful.`,
    },
    {
      day: 27,
      topic: '가정법 과거완료 문장 영작 (과거 사실 반대)',
      content: `과거 사실과 반대되는 상황을 가정하는 영작
• 내가 더 일찍 떠났다면 기차를 놓치지 않았을 텐데. → If I had left earlier, I wouldn't have missed the train.
• 그가 열심히 공부했다면 시험에 합격했을 텐데. → If he had studied hard, he would have passed the exam.
• 네가 나에게 말해줬다면 나는 도와줬을 텐데. → If you had told me, I would have helped you.
• 그녀가 서둘렀다면 비행기를 탔을 텐데. → If she had hurried, she would have caught the flight.
• 내가 그것을 알았다면 다르게 행동했을 텐데. → If I had known that, I would have acted differently.
• 우리가 더 조심했다면 실수하지 않았을 텐데. → If we had been more careful, we wouldn't have made a mistake.
• 그가 더 일찍 왔다면 좋았을 텐데. → I wish he had come earlier.
• 내가 그 말을 하지 않았다면 좋았을 텐데. → I wish I hadn't said that.`,
    },
    {
      day: 28,
      topic: '강조·도치 구문 영작',
      content: `내용을 강조하거나 어순을 도치해 표현하는 영작
• 내가 그 창문을 깬 것이 아니다. → It was not I who broke the window.
• 바로 그가 그 문제를 해결한 사람이다. → It is he who solved the problem.
• 나는 정말로 그것을 좋아한다. → I do like it.
• 나는 그렇게 아름다운 광경을 본 적이 없다. → Never have I seen such a beautiful sight.
• 그가 도착하자마자 비가 내리기 시작했다. → No sooner had he arrived than it began to rain.
• 그녀는 좀처럼 늦지 않는다. → Rarely does she come late.
• 저기 그가 온다. → There he comes.
• 나무 아래 한 소년이 앉아 있었다. → Under the tree sat a boy.`,
    },
    {
      day: 29,
      topic: '이메일·메시지 영작 (실용문)',
      content: `실생활에서 자주 쓰는 이메일·메시지 표현 영작
• 회신 감사합니다. → Thank you for your reply.
• 회의 일정을 확인하고 싶습니다. → I would like to confirm the meeting schedule.
• 빠른 답변 부탁드립니다. → I look forward to your prompt reply.
• 첨부 파일을 확인해 주세요. → Please check the attached file.
• 불편을 드려 죄송합니다. → I apologize for the inconvenience.
• 다음 주에 시간 되시나요? → Are you available next week?
• 자세한 내용은 아래를 참고해 주세요. → Please refer to the details below.
• 궁금한 점이 있으면 언제든 연락 주세요. → Feel free to contact me if you have any questions.`,
    },
    {
      day: 30,
      topic: '자기소개·의견 말하기 영작 (종합)',
      content: `배운 문형을 종합해 자기소개와 의견을 영작하기
• 제 이름은 민준이고 서울에 삽니다. → My name is Minjun, and I live in Seoul.
• 저는 책 읽는 것과 영화 보는 것을 좋아합니다. → I like reading books and watching movies.
• 제 생각에는 꾸준함이 재능보다 중요합니다. → In my opinion, consistency is more important than talent.
• 저는 5년 동안 영어를 공부해 왔습니다. → I have studied English for five years.
• 만약 시간이 더 있다면 여행을 더 많이 다닐 텐데요. → If I had more time, I would travel more.
• 제가 가장 존경하는 사람은 저의 어머니입니다. → The person whom I respect the most is my mother.
• 저는 앞으로 더 나은 사람이 되기 위해 노력할 것입니다. → I will try to become a better person.
• 들어주셔서 감사합니다. → Thank you for listening.`,
    },
  ],
};

const CURRICULA: Record<string, Curriculum> = {
  english_grammar: ENGLISH_GRAMMAR_CURRICULUM,
  english_vocab: ENGLISH_VOCAB_CURRICULUM,
  english_writing: ENGLISH_WRITING_CURRICULUM,
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
