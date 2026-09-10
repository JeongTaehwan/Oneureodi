const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** 네이버 검색 응답의 <b> 태그와 HTML 엔티티를 제거한다. */
export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&(lt|gt|amp|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** "블루보틀 성수점" → "블루보틀". 마지막 토큰이 4자 이내이고 '점'으로 끝나면 지점명으로 본다. */
export function stripBranch(name: string): string {
  return name.replace(/\s+\S{1,4}점$/u, "").trim();
}

/** 이름 비교용 정규화: 지점명 제거, NFKC, 소문자, 공백·구두점 제거. */
export function normalizeName(name: string): string {
  return stripBranch(name)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

/** 두 상호가 같은 곳을 가리키는가. 정규화 후 동일하거나, 3자 이상인 쪽이 다른 쪽의 접두어. */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length === 0 || nb.length === 0) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  return short.length >= 3 && long.startsWith(short);
}
