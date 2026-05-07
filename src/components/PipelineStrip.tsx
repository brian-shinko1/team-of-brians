interface Step {
  num: string;
  name: string;
  sub: string;
}

export function PipelineStrip({ steps }: { steps: Step[] }) {
  return (
    <div className="flex border border-zinc-200 rounded-lg overflow-hidden mb-6">
      {steps.map((step, i) => (
        <div
          key={i}
          className="flex-1 px-4 py-3 bg-white hover:bg-zinc-50 transition-colors border-r border-zinc-200 last:border-r-0"
        >
          <p className="text-[10px] text-zinc-400 mb-0.5">{step.num}</p>
          <p className="text-[12px] font-medium text-zinc-800">{step.name}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">{step.sub}</p>
        </div>
      ))}
    </div>
  );
}
