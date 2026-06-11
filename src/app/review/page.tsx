import { PhasePage } from "@/components/PhasePage";

export default function ReviewPage() {
  return (
    <PhasePage
      phase="Review"
      phaseNum="04"
      subtitle="Security · Doc — definition doc for sign-off before Build"
      steps={[
        { num: "Input", name: "Customer context", sub: "CPS + PRD — from Plan" },
        { num: "Input", name: "Tools + integrations", sub: "agents.md — from Architecture" },
        { num: "Step 1", name: "Security Agent", sub: "Inherit · configure · gap" },
        { num: "Step 2", name: "Doc Agent", sub: "Fills definition template" },
        { num: "Output", name: "Definition Doc", sub: "Pre-build · awaits sign-off" },
      ]}
      agentIds={["security_agent", "doc_agent"]}
      cols={2}
    />
  );
}
