export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

export const REWARD_PER_QUIZ = 100;
export const DAILY_QUIZ_LIMIT = 5;

/** 문제 슬롯이 1개씩 열리는 간격 (1시간마다 다음 문제가 오픈됨) */
export const QUIZ_SLOT_INTERVAL_MS = 60 * 60 * 1000;

// 넌센스/재미 퀴즈 — 여러 세트를 두고 날짜별로 돌아가며 노출해서, 24시간이 지나면
// 새로운 문제 세트가 보이도록 함 (아래 quizSets 참고).
const quizSets: QuizQuestion[][] = [
  [
    {
      id: "q1-1",
      question: "세상에서 가장 뜨거운 개는 무엇일까요?",
      choices: ["핫도그", "불도그", "진돗개"],
      answerIndex: 0,
      explanation: "핫도그(hot dog) = '뜨거운(hot) 개(dog)'라는 뜻이었죠! 😆",
    },
    {
      id: "q1-2",
      question: "포도가 인사를 하면 뭐라고 할까요?",
      choices: ["안녕하세요", "포도야!", "반갑습니다"],
      answerIndex: 1,
      explanation: "포도가 자기 이름을 부르듯 '포도야~' 하고 인사한다는 넌센스예요 🍇",
    },
    {
      id: "q1-3",
      question: "임금님이 넘어지면 뭐라고 소리칠까요?",
      choices: ["아야!", "괜찮아요", "킹콩!"],
      answerIndex: 2,
      explanation: "King(왕) + 쿵(넘어지는 소리) = 킹콩! 넘어진 임금님의 비명이었죠 👑",
    },
    {
      id: "q1-4",
      question: "세상에서 가장 빠른 새는 무엇일까요?",
      choices: ["눈 깜짝할 새", "제비", "독수리"],
      answerIndex: 0,
      explanation: "'눈 깜짝할 사이'라는 말에서 '사이'를 새(鳥)로 바꾼 말장난이에요 🐦",
    },
    {
      id: "q1-5",
      question: "바나나가 웃으면 어떤 과자가 될까요?",
      choices: ["새우깡", "바나나킥", "초코파이"],
      answerIndex: 1,
      explanation: "바나나(banana) + 킥킥 웃는 소리 = 바나나킥! 우리가 아는 그 과자죠 🍌",
    },
  ],
  [
    {
      id: "q2-1",
      question: "세상에서 가장 놀란 사람은 누구일까요?",
      choices: ["소스라치오", "깜짝이", "화들짝씨"],
      answerIndex: 0,
      explanation: "'소스라치다(깜짝 놀라다)'에 사람 이름처럼 '오'를 붙인 넌센스예요 😲",
    },
    {
      id: "q2-2",
      question: "감자가 자꾸 웃으면 뭐가 될까요?",
      choices: ["고구마", "웃자마", "감자칩"],
      answerIndex: 1,
      explanation: "감자가 웃자, 웃자 하다 보니 '웃자마'가 됐다는 말장난이에요 🥔",
    },
    {
      id: "q2-3",
      question: "세상에서 가장 야한 곤충은 무엇일까요?",
      choices: ["잠자리", "매미", "메뚜기"],
      answerIndex: 0,
      explanation: "'자리'를 함께 한다는 뜻의 '잠자리'로 이어지는 순한 말장난 넌센스예요 😄",
    },
    {
      id: "q2-4",
      question: "귤이 죽으면 뭐가 될까요?",
      choices: ["오렌지", "귤한제사", "감귤"],
      answerIndex: 1,
      explanation: "귤이 죽으면(?) '귤한 제사'를 지낸다는 억지 말장난 넌센스예요 🍊",
    },
    {
      id: "q2-5",
      question: "세상에서 가장 추운 바다는 어디일까요?",
      choices: ["썰렁해", "동해", "지중해"],
      answerIndex: 0,
      explanation: "너무 안 웃겨서 '썰렁하다'는 반응 자체가 답이 되는 넌센스예요 🧊",
    },
  ],
  [
    {
      id: "q3-1",
      question: "딸기가 회사에 가면 무엇이 될까요?",
      choices: ["딸기잼", "딸기청", "산딸기"],
      answerIndex: 0,
      explanation: "딸기가 '직장(잼)'에 다니면 딸기잼이 된다는 귀여운 말장난이에요 🍓",
    },
    {
      id: "q3-2",
      question: "세상에서 가장 억울한 과일은 무엇일까요?",
      choices: ["복숭아", "애플(억울)", "체리"],
      answerIndex: 1,
      explanation: "'애 (매우) 플(?)'... 억울함을 강조하는 말장난, 아재개그의 정석이에요 😅",
    },
    {
      id: "q3-3",
      question: "닭이 낳은 이상한 알은 무엇일까요?",
      choices: ["계란", "삶은 계란", "왜 낳았을까"],
      answerIndex: 2,
      explanation: "'낳은 알'과 '왜 낳았을까'의 발음이 비슷한 것을 이용한 말장난이에요 🐔",
    },
    {
      id: "q3-4",
      question: "세상에서 가장 성격 급한 야채는 무엇일까요?",
      choices: ["파", "빨리빨리무", "성급한오이"],
      answerIndex: 0,
      explanation: "'파'는 '빨리'와 발음이 비슷해서 성격 급한 야채로 소문났다는 넌센스예요 🌿",
    },
    {
      id: "q3-5",
      question: "고구마를 먹다가 목이 막히면 무슨 사이다를 마셔야 할까요?",
      choices: ["사이다", "고구마다", "환타"],
      answerIndex: 0,
      explanation: "고구마 먹고 답답할 땐 '사이다'가 진리죠! 뻔하지만 통쾌한 넌센스예요 🥤",
    },
  ],
];

/** 오늘 날짜(YYYY-MM-DD) 기준으로 문제 세트를 순환시켜서, 하루가 지나면 새 세트가 보이게 함 */
export function getQuizzesForDate(dateKey: string): QuizQuestion[] {
  const dayNumber = Math.floor(new Date(`${dateKey}T00:00:00`).getTime() / (1000 * 60 * 60 * 24));
  const setIndex = ((dayNumber % quizSets.length) + quizSets.length) % quizSets.length;
  return quizSets[setIndex];
}
