import type { Metadata } from "next";
import DashboardView from "@/components/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "LifeStory — Andy's Life",
  description: "Browse memory albums",
};

export default function HomePage() {
  return <DashboardView />;
}
