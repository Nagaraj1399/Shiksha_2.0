import React from 'react';

interface MarkdownTextProps {
  text: string;
}

type MarkdownBlock =
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; text: string };

function renderInlineFormatting(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*([^*\n]+?)\*|`([^`]+?)`|\$([^$]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(
        <strong key={keyIndex++} className="font-semibold">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined) {
      parts.push(
        <em key={keyIndex++} className="italic">
          {match[2]}
        </em>
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <code
          key={keyIndex++}
          className="font-mono-tabular text-[0.9em] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10"
        >
          {match[3]}
        </code>
      );
    } else if (match[4] !== undefined) {
      parts.push(
        <span key={keyIndex++} className="font-mono-tabular italic font-medium">
          {match[4]}
        </span>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [line];
}

function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.split('\n');
  const blocks: MarkdownBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h4', text: trimmed.slice(4) });
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      blocks.push({ type: 'h3', text: trimmed.replace(/^#{1,2}\s+/, '') });
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === 'ul') {
        prev.items.push(bulletMatch[1]);
      } else {
        blocks.push({ type: 'ul', items: [bulletMatch[1]] });
      }
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === 'ol') {
        prev.items.push(orderedMatch[1]);
      } else {
        blocks.push({ type: 'ol', items: [orderedMatch[1]] });
      }
      continue;
    }

    blocks.push({ type: 'p', text: line });
  }

  return blocks;
}

/**
 * Renders lightweight Markdown (headings, semantic `<ul>`/`<ol>` lists, bold,
 * italics, inline code, and inline `$math$`) with rem-scaled typography.
 */
export function MarkdownText({ text }: MarkdownTextProps) {
  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="space-y-2 text-[0.9375rem] leading-relaxed break-words">
      {blocks.map((block, idx) => {
        if (block.type === 'h4') {
          return (
            <h4 key={idx} className="font-display font-semibold text-base pt-1">
              {renderInlineFormatting(block.text)}
            </h4>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3 key={idx} className="font-display font-semibold text-lg pt-1">
              {renderInlineFormatting(block.text)}
            </h3>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx}>{renderInlineFormatting(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx}>{renderInlineFormatting(item)}</li>
              ))}
            </ol>
          );
        }

        return <p key={idx}>{renderInlineFormatting(block.text)}</p>;
      })}
    </div>
  );
}
