import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class SanitizeInputMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    mutateObject(req.body as Record<string, unknown>);
    mutateObject(req.query as unknown as Record<string, unknown>);
    mutateObject(req.params as Record<string, unknown>);
    next();
  }
}

const mutateObject = (value: unknown): void => {
  if (!value || typeof value !== 'object') {
    return;
  }

  Object.keys(value as Record<string, unknown>).forEach((key) => {
    const current = (value as Record<string, unknown>)[key];
    (value as Record<string, unknown>)[key] = sanitizeValue(current);
  });
};

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    const cloned = { ...(value as Record<string, unknown>) };
    Object.keys(cloned).forEach((key) => {
      cloned[key] = sanitizeValue(cloned[key]);
    });
    return cloned;
  }

  if (typeof value === 'string') {
    return value
      .replace(/\u0000/g, '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .trim();
  }

  return value;
};

