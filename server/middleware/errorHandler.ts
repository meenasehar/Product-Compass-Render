import { Request, Response, NextFunction } from 'express';

interface AxiosError {
  response?: { status: number; data: unknown };
  message: string;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[error]', err);

  // Surface Jira / upstream API error details if present
  const axiosErr = err as AxiosError;
  if (axiosErr?.response) {
    const upstream = axiosErr.response;
    console.error('[upstream error]', JSON.stringify(upstream.data, null, 2));
    res.status(502).json({ error: `Upstream returned ${upstream.status}`, detail: upstream.data });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}
