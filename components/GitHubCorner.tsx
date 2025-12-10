import React from 'react';

interface GitHubCornerProps {
  href: string;
}

/**
 * 渲染右上角的 GitHub 角标，点击跳转到指定仓库
 */
export const GitHubCorner: React.FC<GitHubCornerProps> = ({ href }) => {
  return (
    <a
      href={href}
      aria-label="查看 GitHub 仓库"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed top-0 right-0 z-50"
    >
      <svg
        width="80"
        height="80"
        viewBox="0 0 250 250"
        fill="currentColor"
        className="text-slate-800 hover:text-slate-700"
      >
        <path d="M0 0h250v250H0z" fill="none" />
        <path d="M0 0l115 115h15l12 27 108 108V0z" className="text-indigo-600" fill="currentColor" />
        <path
          d="M128 109c-15-11-9-14-9-14 3-3 6-1 6-1 6 4 4 11 4 11-2 7 5 11 5 11l1 1c-1 3-4 12-17 8-13-4-7-23-7-23 2-7-1-10-1-10-6-4 0-4 0-4 7 1 10 7 10 7 6 10 16 8 20 6 0-5 3-8 5-9-12-1-24-6-24-26 0-6 2-11 6-15-1-2-3-8 1-16 0 0 5-2 16 6 5-1 10-2 16-2s11 1 16 2c11-8 16-6 16-6 4 8 2 14 1 16 4 4 6 9 6 15 0 20-12 25-24 26 3 2 6 7 6 15 0 11 0 19 0 22 0 3 2 6 7 5 41-14 49-54 49-54 10-26-1-46-1-46-10-19-25-24-25-24-21-9-53-1-53-1h-1s-32-8-53 1c0 0-15 5-25 24 0 0-11 20-1 46 0 0 8 40 49 54 5 1 7-2 7-5 0-3 0-11 0-22 0-8 3-13 6-15-12-1-24-6-24-26 0-6 2-11 6-15-1-2-3-8 1-16 0 0 5-2 16 6 5-1 10-2 16-2 6 0 11 1 16 2 11-8 16-6 16-6 4 8 2 14 1 16 4 4 6 9 6 15 0 20-12 25-24 26 3 2 6 7 6 15 0 11 0 19 0 22 0 3 2 6 7 5"
          fill="white"
        />
      </svg>
    </a>
  );
};

