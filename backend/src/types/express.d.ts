// Global augmentation so `req.user` is typed throughout the app.
// This file is ambient (picked up via tsconfig `include`) — no runtime import needed.

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        displayName: string;
        affiliation: string[];
        orgUnitDN: string | null;
        memberOf: string[];
      };
    }
  }
}

export {};
