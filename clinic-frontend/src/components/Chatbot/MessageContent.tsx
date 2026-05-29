'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  text: string;
  className?: string;
};

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'strike'; value: string }
  | { type: 'code'; value: string };

const INLINE_PATTERNS: Array<{ type: InlineToken['type']; re: RegExp }> = [
  { type: 'code',   re: /`([^`\n]+)`/ },
  { type: 'bold',   re: /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/ },
  { type: 'italic', re: /(?:^|(?<=[\s(_~`]))_([^_\n]+)_(?=$|[\s).,!?:;_~`])/ },
  { type: 'strike', re: /~([^~\n]+)~/ },
];

const parseInline = (input: string): InlineToken[] => {
  if (!input) return [];

  let earliest: { type: InlineToken['type']; index: number; match: RegExpExecArray } | null = null;
  for (const { type, re } of INLINE_PATTERNS) {
    const m = re.exec(input);
    if (m && (earliest === null || m.index < earliest.index)) {
      earliest = { type, index: m.index, match: m };
    }
  }

  if (!earliest) return [{ type: 'text', value: input }];

  const { type, index, match } = earliest;
  const before = input.slice(0, index);
  const after = input.slice(index + match[0].length);
  const value = match[1] ?? match[2] ?? '';

  const tokens: InlineToken[] = [];
  if (before) tokens.push(...parseInline(before));
  tokens.push({ type, value });
  if (after) tokens.push(...parseInline(after));
  return tokens;
};

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  return parseInline(text).map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (tok.type) {
      case 'bold':
        return <strong key={key} className="font-semibold">{renderInline(tok.value, key)}</strong>;
      case 'italic':
        return <em key={key}>{renderInline(tok.value, key)}</em>;
      case 'strike':
        return <span key={key} className="line-through">{renderInline(tok.value, key)}</span>;
      case 'code':
        return (
          <code key={key} className="px-1 py-0.5 rounded bg-black/20 dark:bg-white/10 font-mono text-[0.9em]">
            {tok.value}
          </code>
        );
      default:
        return <span key={key}>{tok.value}</span>;
    }
  });
};

type Block =
  | { type: 'codeblock'; value: string }
  | { type: 'quote'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[]; start: number }
  | { type: 'p'; lines: string[] };

const parseBlocks = (text: string): Block[] => {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'codeblock', value: buf.join('\n') });
      continue;
    }

    // Quote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', lines: buf });
      continue;
    }

    // Unordered list
    if (/^\s*[*-]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[*-]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[*-]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items: buf });
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\s*(\d+)\.\s+/);
    if (olMatch) {
      const start = parseInt(olMatch[1], 10);
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items: buf, start });
      continue;
    }

    // Blank line — break paragraph
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph (group consecutive non-empty, non-special lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[*-]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', lines: buf });
  }

  return blocks;
};

const renderParagraphLines = (lines: string[], keyPrefix: string): React.ReactNode => {
  return lines.map((ln, idx) => (
    <React.Fragment key={`${keyPrefix}-l${idx}`}>
      {renderInline(ln, `${keyPrefix}-l${idx}`)}
      {idx < lines.length - 1 && <br />}
    </React.Fragment>
  ));
};

export const MessageContent: React.FC<Props> = ({ text, className }) => {
  if (!text) return null;
  const blocks = parseBlocks(text);

  return (
    <div className={cn('space-y-2', className)}>
      {blocks.map((block, bi) => {
        const key = `b-${bi}`;
        switch (block.type) {
          case 'codeblock':
            return (
              <pre
                key={key}
                className="overflow-x-auto rounded-md bg-black/30 dark:bg-white/5 p-3 font-mono text-[12.5px] leading-relaxed border border-black/10 dark:border-white/10"
              >
                <code>{block.value}</code>
              </pre>
            );
          case 'quote':
            return (
              <blockquote
                key={key}
                className="border-l-2 border-current/40 pl-3 italic opacity-90"
              >
                {renderParagraphLines(block.lines, key)}
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={key} className="list-disc pl-5 space-y-1">
                {block.items.map((it, ii) => (
                  <li key={`${key}-i${ii}`}>{renderInline(it, `${key}-i${ii}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} start={block.start} className="list-decimal pl-5 space-y-1">
                {block.items.map((it, ii) => (
                  <li key={`${key}-i${ii}`}>{renderInline(it, `${key}-i${ii}`)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={key} className="whitespace-pre-wrap break-words">
                {renderParagraphLines(block.lines, key)}
              </p>
            );
        }
      })}
    </div>
  );
};

export default MessageContent;
