import React from 'react';
import { Copy, Check } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

interface EditorProps {
  title: string;
  code: string;
  readOnly?: boolean;
  onChange?: (val: string) => void;
  language?: string;
  action?: React.ReactNode;
}

export const Editor: React.FC<EditorProps> = ({ title, code, readOnly, onChange, action, language }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/50 border-b border-slate-800">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="flex items-center gap-2">
          {action}
          {readOnly && (
            <button 
              onClick={handleCopy}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title="复制到剪贴板"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          )}
        </div>
      </div>
      {readOnly && language ? (
        <CodeBlock code={code} language={language} />
      ) : (
        <textarea
          className={`flex-1 min-h-0 w-full bg-slate-900 p-4 font-mono text-sm leading-6 resize-none focus:outline-none focus:ring-0 overflow-auto ${readOnly ? 'text-slate-400' : 'text-slate-200'}`}
          value={code}
          onChange={(e) => onChange && onChange(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          placeholder={readOnly ? "等待输入..." : "// 请在此粘贴 C 语言数组...\nconst unsigned char data[] = { 0x00, 0xFF, ... };"}
        />
      )}
    </div>
  );
};
