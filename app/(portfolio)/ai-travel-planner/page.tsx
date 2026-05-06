import type { Metadata } from "next";
import { TravelPlannerDemo } from "@/components/TravelPlannerDemo";

export const metadata: Metadata = {
  title: "AI Travel Planner | Satya Vamsi",
  description:
    "Interactive demo of an AI-powered travel planner built with LangGraph — watch each agent node activate, process, and stream results in real time.",
};

export default function TravelPlannerPage() {
  return <TravelPlannerDemo />;
}
