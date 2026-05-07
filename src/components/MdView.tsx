"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-[17px] font-bold text-zinc-900 mb-3 mt-6 first:mt-0 leading-snug">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[13px] font-semibold text-zinc-900 mt-6 mb-2 first:mt-0 pl-3 border-l-[3px] border-zinc-900">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[12px] font-semibold text-zinc-700 mt-4 mb-1.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[12px] text-zinc-600 leading-relaxed mb-3 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-zinc-500">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1.5 text-[12px] text-zinc-600 pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1.5 text-[12px] text-zinc-600">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 leading-relaxed">
      <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
      <span>{children}</span>
    </li>
  ),
  code: ({ children, className }) => {
    const isBlock = !!className;
    return isBlock ? (
      <pre className="text-[11px] bg-zinc-100 rounded-md px-3 py-2.5 overflow-x-auto mb-3 font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="text-[11px] bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded font-mono">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-zinc-200 pl-4 text-zinc-500 italic my-3 bg-zinc-50 py-2 rounded-r-md">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-zinc-100 my-5" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3 rounded-lg border border-zinc-200">
      <table className="text-[11px] min-w-full border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50 px-3 py-2 border-b border-zinc-200 whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-zinc-100 text-zinc-700 align-top last:border-0 max-w-[320px] break-words">{children}</td>
  ),
};

export function MdView({ content }: { content: string }) {
  return (
    <div className="min-h-[40px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
