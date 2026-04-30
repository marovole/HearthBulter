import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";

export default function HealthDataLayout({ children }: { children: React.ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
