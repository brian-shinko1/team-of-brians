"use client";

import { useAgents } from "@/context/AgentsContext";
import { AgentModal } from "@/components/AgentModal";

export function ModalHost() {
  const { pendingModal, closeModal } = useAgents();
  if (!pendingModal) return null;
  return (
    <AgentModal
      agentId={pendingModal.agentId}
      onClose={closeModal}
      prefilledInput={pendingModal.prefilledInput}
    />
  );
}
