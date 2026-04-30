import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
