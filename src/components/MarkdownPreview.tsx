"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface PreviewFile {
  filename: string;
  content: string;
}

export interface MarkdownPreviewHandle {
  jumpTo: (filename: string) => void;
}

export const MarkdownPreview = forwardRef<MarkdownPreviewHandle, { files: PreviewFile[] }>(
  function MarkdownPreview({ files }, ref) {
    const [active, setActive] = useState(0);

    useImperativeHandle(
      ref,
      () => ({
        jumpTo: (filename: string) => {
          const idx = files.findIndex((f) => f.filename === filename);
          if (idx >= 0) setActive(idx);
        },
      }),
      [files],
    );

    if (files.length === 0) return null;
    const current = files[active] ?? files[0];

    return (
      <div className="flex flex-col border border-stone-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 px-2 pt-2 bg-stone-50 border-b border-stone-200">
          {files.map((f, i) => (
            <button
              key={f.filename}
              onClick={() => setActive(i)}
              className={`px-3 py-1.5 rounded-t-md text-xs font-mono transition-colors ${
                i === active
                  ? "bg-white text-amber-700 border border-stone-200 border-b-transparent"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {f.filename}
            </button>
          ))}
        </div>
        <div className="prose prose-sm max-w-none px-6 py-4 bg-white max-h-[60vh] overflow-y-auto prose-headings:text-stone-900 prose-a:text-amber-700 prose-code:text-amber-800 prose-code:bg-stone-100 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.content}</ReactMarkdown>
        </div>
      </div>
    );
  },
);
