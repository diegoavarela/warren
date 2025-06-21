import { Request, Response, NextFunction } from 'express'

export function noCacheHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent caching of API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Surrogate-Control', 'no-store')
  next()
}
