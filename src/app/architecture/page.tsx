import { PhasePage } from "@/components/PhasePage";
export default function ArchitecturePage() {
  return (
    <PhasePage
      phase="Architecture"
      phaseNum="03"
      subtitle="Architecture · Spec · agents.md — code-level AI-consumable specification"
      steps={[
        { num: "Step 1", name: "Architecture", sub: "Technical blueprint · data transfer design" },
        { num: "Step 2", name: "Spec Agent", sub: "API contracts · schemas · integration specs" },
        { num: "Step 3", name: "Agents.md", sub: "Code-level agent context file" },
        { num: "Output", name: "Code Spec", sub: "AI-consumable · feeds Build" },
      ]}
      agentIds={["architecture", "spec", "agents_md"]}
      cols={3}
    />
  );
}
