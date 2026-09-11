/**
 * 네이버쇼핑 상품명·태그(키워드) 검수 규칙.
 *
 * 근거: 네이버 쇼핑 검색 SEO 가이드 + 스마트스토어 상품명 검색품질 체크 규칙.
 * 랭킹은 적합도·인기도·신뢰도로 매겨지고, 상품명 가이드를 벗어나면 "SEO 스코어" 페널티가
 * 붙는다. 다른 정보가 아무리 좋아도 이 페널티는 랭킹에 크게 불리하게 작용하므로,
 * 상품명은 "키워드를 많이 넣는 것"보다 "가이드를 어기지 않는 것"이 우선이다.
 *
 * 이 파일은 판정만 한다 — 실제 수정은 사람이 확인하고 결정한다.
 */

/** 상품명 권장 최대 길이. 이보다 길면 검색품질 체크에서 감점된다. */
export const MAX_NAME_LENGTH = 50;

/** 태그는 개수 제한 없이 입력해도 실제 검색에는 10개까지만 반영된다. */
export const MAX_TAGS = 10;

/**
 * 상품명에 허용되는 기호: 괄호, 대괄호, +, -, ~, /, %, 콤마, 마침표.
 * 그 외 기호(★, ♥, !, ?, #, * 등)는 가이드 위반이다.
 */
const ALLOWED_NAME_CHARS = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s()[\]+\-~/%,.]*$/;
const DISALLOWED_CHAR_FINDER = /[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s()[\]+\-~/%,.]/g;

/**
 * 상품과 무관한 홍보·수식 문구. 상품명에 쓰면 감점이고, 태그로 써도 검색에 도움이 안 된다.
 * (태그사전에 없는 말이거나, 있어도 구매 의도가 없는 검색어라 유입이 안 된다)
 */
const PROMO_WORDS = [
  "최저가", "최고", "초특가", "특가", "할인", "세일", "이벤트", "사은품", "증정",
  "무료배송", "당일발송", "빠른배송", "품절임박", "한정", "마감임박", "정품",
  "프리미엄", "명품", "최상급", "인기", "베스트", "추천", "강추", "대박", "가성비",
  "1위", "no1", "best", "hot", "new", "sale",
];

/** 상품명에 넣으면 안 되는 판매처·쇼핑몰 이름 (판매처는 네이버가 따로 노출해준다) */
const SELLER_NAMES = ["바로산지", "barosanji", "스마트스토어", "네이버"];

/**
 * 수산물 상태어 ↔ 카테고리 정합성.
 * "활/생물"인데 건어물 카테고리에 있으면 적합도에서 크게 불리하다.
 * (검색의도가 완전히 다른 카테고리라 노출 자체가 어긋난다)
 */
const FRESH_WORDS = ["활", "생물", "생", "선어"];
const DRIED_CATEGORY_HINTS = ["건어물", "건조"];

export type KeywordIssue = {
  /** error = 가이드 위반(페널티 위험), warn = 손해는 아니지만 개선 여지 */
  level: "error" | "warn";
  field: "상품명" | "태그" | "카테고리";
  message: string;
};

export type KeywordCheckInput = {
  name: string;
  tags?: string[];
  /** "식품>수산물>건어물>문어" 같은 전체 카테고리명 */
  categoryName?: string;
};

/** 상품명에서 의미 단위 토큰을 뽑는다 (기호·공백 제거, 2글자 이상만) */
function tokenize(name: string): string[] {
  return name
    .replace(DISALLOWED_CHAR_FINDER, " ")
    .split(/[\s()[\]+\-~/%,.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * 상품명 안에서 같은 단어가 반복되는지 본다.
 * 완전히 같은 토큰뿐 아니라, 한 토큰이 다른 토큰에 통째로 들어있는 경우도 중복으로 본다.
 * (예: "활수꽃게 ... 찜용 꽃게" → 꽃게가 두 번)
 */
function findRepeatedWords(tokens: string[]): string[] {
    const repeated = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const a = tokens[i];
      const b = tokens[j];
      if (a === b) repeated.add(a);
      else if (a.length >= 2 && b.includes(a)) repeated.add(a);
      else if (b.length >= 2 && a.includes(b)) repeated.add(b);
    }
  }
  return [...repeated];
}

export function checkKeywords(input: KeywordCheckInput): KeywordIssue[] {
  const issues: KeywordIssue[] = [];
  const name = input.name ?? "";
  const tags = (input.tags ?? []).map((t) => t.replace(/^#/, "").trim()).filter(Boolean);
  const lowerName = name.toLowerCase();

  // ---- 상품명 ----
  if (name.length > MAX_NAME_LENGTH) {
    issues.push({
      level: "error",
      field: "상품명",
      message: `${name.length}자 — 권장 ${MAX_NAME_LENGTH}자를 넘었습니다. 긴 상품명은 검색품질 체크에서 감점됩니다.`,
    });
  }

  if (!ALLOWED_NAME_CHARS.test(name)) {
    const bad = [...new Set(name.match(DISALLOWED_CHAR_FINDER) ?? [])];
    issues.push({
      level: "error",
      field: "상품명",
      message: `허용되지 않는 기호 사용: ${bad.join(" ")} — 괄호 [] () 와 + - ~ / % , . 만 쓸 수 있습니다.`,
    });
  }

  const repeated = findRepeatedWords(tokenize(name));
  if (repeated.length > 0) {
    issues.push({
      level: "error",
      field: "상품명",
      message: `같은 단어 반복: ${repeated.join(", ")} — 반복 단어는 가이드 위반이고 검색에도 도움이 안 됩니다.`,
    });
  }

  const promoInName = PROMO_WORDS.filter((w) => lowerName.includes(w));
  if (promoInName.length > 0) {
    issues.push({
      level: "error",
      field: "상품명",
      message: `홍보·수식 문구 포함: ${promoInName.join(", ")} — 상품명에서 빼주세요.`,
    });
  }

  const sellerInName = SELLER_NAMES.filter((w) => lowerName.includes(w.toLowerCase()));
  if (sellerInName.length > 0) {
    issues.push({
      level: "error",
      field: "상품명",
      message: `판매처·쇼핑몰 이름 포함: ${sellerInName.join(", ")} — 판매처는 네이버가 따로 표시하므로 빼야 합니다.`,
    });
  }

  // ---- 카테고리 정합성 ----
  if (input.categoryName) {
    const isDriedCategory = DRIED_CATEGORY_HINTS.some((h) => input.categoryName!.includes(h));
    const freshWord = FRESH_WORDS.find((w) => new RegExp(`(^|\\s)${w}`).test(name));
    if (isDriedCategory && freshWord) {
      issues.push({
        level: "error",
        field: "카테고리",
        message:
          `상품명은 "${freshWord}"(신선)인데 카테고리가 "${input.categoryName}"입니다. ` +
          `카테고리가 어긋나면 적합도에서 크게 불리합니다 — 카테고리를 바로잡아주세요.`,
      });
    }
  }

  // ---- 태그 ----
  if (tags.length > MAX_TAGS) {
    issues.push({
      level: "warn",
      field: "태그",
      message: `${tags.length}개 — 검색에는 ${MAX_TAGS}개까지만 반영됩니다. 중요한 것부터 ${MAX_TAGS}개로 줄이세요.`,
    });
  } else if (tags.length < MAX_TAGS) {
    issues.push({
      level: "warn",
      field: "태그",
      message: `${tags.length}개 — ${MAX_TAGS}개까지 채우는 편이 노출에 유리합니다.`,
    });
  }

  const dupWithName = tags.filter((t) => lowerName.includes(t.toLowerCase()));
  if (dupWithName.length > 0) {
    issues.push({
      level: "warn",
      field: "태그",
      message:
        `상품명에 이미 있는 말: ${dupWithName.join(", ")} — 상품명에 없는 다른 검색어로 바꾸면 ` +
        `그만큼 유입 경로가 늘어납니다.`,
    });
  }

  const promoTags = tags.filter((t) => PROMO_WORDS.some((w) => t.toLowerCase().includes(w)));
  if (promoTags.length > 0) {
    issues.push({
      level: "warn",
      field: "태그",
      message: `구매 검색어가 아닌 수식어: ${promoTags.join(", ")} — 실제로 검색되는 말로 바꾸세요.`,
    });
  }

  const dupTags = tags.filter((t, i) => tags.findIndex((x) => x.toLowerCase() === t.toLowerCase()) !== i);
  if (dupTags.length > 0) {
    issues.push({
      level: "warn",
      field: "태그",
      message: `중복 태그: ${[...new Set(dupTags)].join(", ")}`,
    });
  }

  return issues;
}
