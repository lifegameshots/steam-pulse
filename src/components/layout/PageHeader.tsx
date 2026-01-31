'use client';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  pageName?: string;
}

export function PageHeader({ title, description, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-white">
        <span className="flex-shrink-0">{icon}</span>
        <span className="truncate">{title}</span>
      </h1>
      <p className="text-sm text-steel-grey truncate">{description}</p>
    </div>
  );
}
