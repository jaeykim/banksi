declare module 'express' {
  interface Request {
    headers: Record<string, string | string[] | undefined>;
  }
  interface Response {
    status(code: number): Response;
    json(body: unknown): void;
  }
  type NextFunction = () => void;
}
