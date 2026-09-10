/** 어떤 모델을 어느 자리에 쓰는지. 제공자별 환경변수에서 채운다. */
export class LlmModels {
  constructor(
    /** 웹검색으로 코스 추천 글 찾기 + 그 글에서 장소 뽑기 */
    public readonly search: string,
    /** 후보 중 코스 짜기 */
    public readonly compose: string,
  ) {}
}
