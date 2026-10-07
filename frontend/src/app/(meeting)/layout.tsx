/** The meeting detail page brings its own chrome (breadcrumb bar, insight rail, player), not the main sidebar. */
export default function MeetingLayout({ children }: LayoutProps<"/">) {
  return <div className="h-dvh overflow-hidden bg-background">{children}</div>;
}
