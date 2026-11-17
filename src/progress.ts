import { byId } from './engine';
export const STORAGE_KEY = 'eml-lab.progress.v1';
export interface Progress {
  version: 1;
  unlocked: string[];
  solutions: Record<string, string>;
}
export const freshProgress = (): Progress => ({ version: 1, unlocked: [], solutions: {} });
export function decodeProgress(raw: string | null): Progress {
  if (!raw) return freshProgress();
  try {
    const p = JSON.parse(raw);
    if (p.version !== 1 || !Array.isArray(p.unlocked)) return freshProgress();
    const unlocked: string[] = [];
    // Rebuild the dependency chain rather than trusting stale or malformed IDs.
    for (let pass = 0; pass < Object.keys(byId).length; pass++)
      for (const id of p.unlocked)
        if (
          typeof id === 'string' &&
          byId[id] &&
          !unlocked.includes(id) &&
          byId[id].deps.every((dep) => unlocked.includes(dep))
        )
          unlocked.push(id);
    const solutions: Record<string, string> = {};
    for (const id of unlocked)
      if (typeof p.solutions?.[id] === 'string') solutions[id] = p.solutions[id].slice(0, 16000);
    return { version: 1, unlocked, solutions };
  } catch {
    return freshProgress();
  }
}
