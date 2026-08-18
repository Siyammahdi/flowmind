import { Fragment } from "react";

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function AgentMarkdown({ content }: { content: string }) {
  const items = content
    .split("\n")
    .map((line) => line.replace(/^\s*[-*+]\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-3 pl-0 text-[15px] leading-8">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-3 size-1 shrink-0 rounded-full bg-primary" />
          <span>{renderInline(item, `b-${index}`)}</span>
        </li>
      ))}
    </ul>
  );
}
