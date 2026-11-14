import type { Metadata } from "next";
import CasefileApp from "@/components/casefile/CasefileApp";

export const metadata: Metadata = {
  title: "Investigations",
  description: "Which NASA investigations come closest to your scenario, how they differ, and where each number comes from. Evidence proximity, not a safety rating.",
};

export default function Page() {
  return <CasefileApp />;
}
