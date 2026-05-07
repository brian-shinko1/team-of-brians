import { FeedItem as FeedItemType } from "@/lib/types";

export function FeedItem({ item }: { item: FeedItemType }) {
  return (
    <div className="px-5 py-3.5 border-b border-zinc-100 last:border-none hover:bg-zinc-50 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
          style={{ color: item.phaseColor, background: item.phaseColor + "18" }}
        >
          {item.phase}
        </span>
        <span className="text-[12px] font-medium text-zinc-800">{item.agent}</span>
        <span className="ml-auto text-[11px] text-zinc-400 shrink-0">{item.time}</span>
      </div>
      <p className="text-[12px] text-zinc-500 leading-relaxed">{item.content}</p>
    </div>
  );
}
