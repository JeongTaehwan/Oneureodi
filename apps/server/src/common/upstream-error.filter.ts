import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";
import { UpstreamError } from "./http";

/** 외부 API(카카오·네이버·OpenAI) 실패는 502 로. 무엇이 실패했는지 서비스 이름만 노출한다. */
@Catch(UpstreamError)
export class UpstreamErrorFilter implements ExceptionFilter {
  private readonly log = new Logger(UpstreamErrorFilter.name);

  catch(err: UpstreamError, host: ArgumentsHost) {
    this.log.warn(err.message);
    const res = host.switchToHttp().getResponse<Response>();
    res.status(HttpStatus.BAD_GATEWAY).json({
      statusCode: HttpStatus.BAD_GATEWAY,
      message: `외부 서비스(${err.service}) 응답에 실패했습니다`,
      service: err.service,
    });
  }
}
