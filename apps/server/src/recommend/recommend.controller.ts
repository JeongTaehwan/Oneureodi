import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { RecommendRequestSchema, type RecommendRequest, type RecommendResponse } from "@oneureodi/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RecommendService } from "./recommend.service";

@Controller("recommendations")
export class RecommendController {
  constructor(private readonly service: RecommendService) {}

  @Post()
  @HttpCode(200)
  recommend(@Body(new ZodValidationPipe(RecommendRequestSchema)) body: RecommendRequest): Promise<RecommendResponse> {
    return this.service.recommend(body);
  }
}
