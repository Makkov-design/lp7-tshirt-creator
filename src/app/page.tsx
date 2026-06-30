import participants from "../../data/participants.json";
import { CreatorApp } from "@/components/creator-app";
import type { Participant } from "@/lib/types";

export default function Home() {
  return <CreatorApp participants={participants as Participant[]} />;
}
