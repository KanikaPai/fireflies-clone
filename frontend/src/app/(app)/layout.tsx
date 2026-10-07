import { AppShell } from "@/components/layout/AppShell";

/** Pages that share the main sidebar + topbar chrome. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
