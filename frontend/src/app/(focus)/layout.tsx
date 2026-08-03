type FocusLayoutProps = {
  children: React.ReactNode;
};

/**
 * Focus routes intentionally render without workspace navigation so learners can
 * concentrate on an exam, its result, or a focused practice session.
 */
export default function FocusLayout({ children }: FocusLayoutProps) {
  return <>{children}</>;
}
