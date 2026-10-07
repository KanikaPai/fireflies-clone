/** Print view: no app chrome, always a white page regardless of the theme. */
export default function PrintLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-dvh bg-white text-neutral-900">{children}</div>;
}
