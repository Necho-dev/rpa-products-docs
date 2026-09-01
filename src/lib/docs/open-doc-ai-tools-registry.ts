import type { OpenDocToolExecutors } from '@/lib/docs/open-doc-ai-tools';

let executors: OpenDocToolExecutors | null = null;

export function setOpenDocToolExecutors(next: OpenDocToolExecutors | null): void {
  executors = next;
}

export function getOpenDocToolExecutors(): OpenDocToolExecutors | null {
  return executors;
}
