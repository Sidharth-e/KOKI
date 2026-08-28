"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const isInline = !match && !codeString.includes("\n");

  if (isInline) {
    return (
      <code
        className={cn(
          "px-1.5 py-0.5 rounded-md bg-secondary/80 text-foreground font-mono text-xs border border-border/50",
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 rounded-xl border border-border/80 bg-secondary/40 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/70 bg-secondary/60 text-muted-foreground">
        <span className="text-[11px] font-medium tracking-wide">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-success" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto custom-scrollbar bg-card/60">
        <pre className="text-foreground leading-relaxed">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("text-sm leading-relaxed text-foreground break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          code: CodeBlock,
          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2.5 mb-1 text-foreground">{children}</h3>,
          h4: ({ children }) => <h4 className="text-xs font-semibold mt-2 mb-1 text-foreground">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-4 space-y-1 mb-2.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-4 space-y-1 mb-2.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic bg-secondary/20 py-1 rounded-r-md">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full text-xs text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-secondary/60 text-foreground border-b border-border/80">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border/60">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-secondary/30 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 font-medium">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-foreground">{children}</td>,
          hr: () => <hr className="my-3 border-border/60" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
