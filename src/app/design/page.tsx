import { PhasePage } from "@/components/PhasePage";
export default function DesignPage() {
  return (
    <PhasePage
      phase="Design"
      phaseNum="02"
      subtitle="Event Storming · Principles · Domain Model — structured design intelligence"
      steps={[
        { num: "Step 1", name: "Event Storming", sub: "Domain events & bounded contexts" },
        { num: "Step 2", name: "Principles Doc", sub: "HITL · audit trail · ubiquitous language" },
        { num: "Step 3", name: "Domain Model", sub: "Entities · aggregates · value objects" },
        { num: "Output", name: "Design Docs", sub: "Feeds Architecture phase" },
      ]}
      agentIds={["event_storm", "principles", "domain_model"]}
      cols={3}
      showSessionNotes
    />
  );
}
