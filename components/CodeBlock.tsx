import React from 'react';
import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'c' }) => {
  return (
    <div className="flex-1 h-full w-full min-h-0 bg-slate-900 p-4 font-mono text-sm leading-6 overflow-auto">
      <Highlight theme={themes.vsDark} code={code} language={language as any}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} m-0 min-w-full whitespace-pre`} style={style}>
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line, key: i });
              const { key: _lk, ...restLine } = lineProps as any;
              return (
                <div key={i} {...restLine}>
                  {line.map((token, j) => {
                    const tokenProps = getTokenProps({ token, key: j });
                    const { key: _tk, ...restToken } = tokenProps as any;
                    return <span key={j} {...restToken} />;
                  })}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
};

