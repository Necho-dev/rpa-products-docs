import './auth.css';

export default function Layout({ children }: LayoutProps<'/auth'>) {
  return <div className="relative flex min-h-dvh w-full flex-col text-fd-foreground">{children}</div>;
}
