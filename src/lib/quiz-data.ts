export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

export const REWARD_PER_QUIZ = 100;
export const DAILY_QUIZ_LIMIT = 5;

// 하루 5문제 고정 (실제 서비스에서는 매일 랜덤/서버에서 문제 세트를 내려주는 방식으로 교체 필요)
export const dailyQuizzes: QuizQuestion[] = [
  {
    id: "q1",
    question: "사과를 오래 신선하게 보관하려면 어디에 두는 것이 좋을까요?",
    choices: ["실온 그늘", "냉장고 채소칸", "햇볕 드는 창가"],
    answerIndex: 1,
    explanation: "사과는 냉장 보관 시 실온보다 훨씬 오래 신선함을 유지할 수 있어요.",
  },
  {
    id: "q2",
    question: "다음 중 대표적인 '산지직송'의 장점이 아닌 것은?",
    choices: ["유통 단계 감소", "신선도 유지", "무조건 최저가 보장"],
    answerIndex: 2,
    explanation: "산지직송은 신선도와 유통 효율을 높여주지만, 가격은 산지 상황에 따라 달라질 수 있어요.",
  },
  {
    id: "q3",
    question: "제철 과일로 알려진 '감귤'의 대표 산지는 어디일까요?",
    choices: ["제주", "강원 산간", "경기 북부"],
    answerIndex: 0,
    explanation: "제주는 따뜻한 기후 덕분에 감귤 재배로 유명한 대표 산지예요.",
  },
  {
    id: "q4",
    question: "쌀을 맛있게 오래 보관하는 방법으로 가장 좋은 것은?",
    choices: ["햇볕에 두기", "서늘하고 밀폐된 곳에 보관", "물에 젖은 채로 보관"],
    answerIndex: 1,
    explanation: "쌀은 서늘하고 밀폐된 환경에서 보관해야 밥맛과 신선도를 오래 유지할 수 있어요.",
  },
  {
    id: "q5",
    question: "'절임배추'는 주로 어떤 요리를 준비할 때 사용할까요?",
    choices: ["김장", "튀김", "샐러드"],
    answerIndex: 0,
    explanation: "절임배추는 김장철 김치를 담글 때 바로 사용할 수 있도록 미리 절여 놓은 배추예요.",
  },
];
