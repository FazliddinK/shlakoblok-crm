"use client";

import { MobileNav } from "./sidebar";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  userName: string;
}

export function PageHeader({ title, description, action, userName }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <MobileNav userName={userName} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
