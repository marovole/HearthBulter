import Hero from "@/components/landing/Hero";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StatsCounter from "@/components/landing/StatsCounter";
import TestimonialCarousel from "@/components/landing/TestimonialCarousel";
import { HomeMarketingShell } from "@/components/landing/HomeMarketingShell";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <FeaturesSection />
      <StatsCounter />
      <TestimonialCarousel />
      <HomeMarketingShell />
    </main>
  );
}
