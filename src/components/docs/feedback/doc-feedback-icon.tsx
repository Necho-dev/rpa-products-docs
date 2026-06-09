import { cn } from '@/lib/core/cn';

type DocFeedbackIconProps = {
  className?: string;
};

/** 右下角浮动按钮：双气泡反馈图标（随主题色 currentColor 着色） */
export function DocFeedbackIcon({ className }: DocFeedbackIconProps) {
  return (
    <svg
      className={cn('size-full shrink-0 text-inherit', className)}
      viewBox="0 0 1137 1024"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M224.711111 170.666667L227.555556 687.502222h458.353777L759.352889 796.444444H455.111111l-142.222222 227.555556L170.666667 796.444444H0V170.666667h224.711111z"
      />
      <path
        fill="currentColor"
        d="M1024 625.777778l-142.222222 227.555555-142.222222-227.555555H284.444444V0h853.333334v625.777778h-113.777778z m-284.444444-284.444445a56.888889 56.888889 0 1 0 0-113.777777 56.888889 56.888889 0 0 0 0 113.777777z m227.555555 0a56.888889 56.888889 0 1 0 0-113.777777 56.888889 56.888889 0 0 0 0 113.777777zM512 341.333333a56.888889 56.888889 0 1 0 0-113.777777 56.888889 56.888889 0 0 0 0 113.777777z"
      />
    </svg>
  );
}
