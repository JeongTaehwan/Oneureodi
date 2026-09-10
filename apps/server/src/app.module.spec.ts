import { Test } from "@nestjs/testing";

/** DI 그래프가 실제로 풀리는지만 본다. DB·외부 API 는 건드리지 않는다. */
describe("AppModule", () => {
  const saved = { ...process.env };

  beforeAll(() => {
    // ConfigModule.forRoot 의 validate 는 모듈 import 시점에 돌므로, import 전에 채운다.
    Object.assign(process.env, {
      DATABASE_URL: "postgresql://x@localhost:5432/x",
      KAKAO_REST_API_KEY: "k",
      GEMINI_API_KEY: "g",
    });
  });

  afterAll(() => {
    process.env = saved;
  });

  it("모든 provider 가 주입된다", async () => {
    const { AppModule } = await import("./app.module");
    const { PrismaService } = await import("./prisma/prisma.service");
    const { RecommendService } = await import("./recommend/recommend.service");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    expect(moduleRef.get(RecommendService)).toBeInstanceOf(RecommendService);
    await moduleRef.close();
  });
});
