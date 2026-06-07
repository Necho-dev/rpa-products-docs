import type { ExcerptToolExecutors } from '@/lib/docs/selection/excerpt-ai-tools';

let executors: ExcerptToolExecutors | null = null;

export function setExcerptToolExecutors(next: ExcerptToolExecutors | null): void {
  executors = next;
}

export function getExcerptToolExecutors(): ExcerptToolExecutors | null {
  return executors;
}
