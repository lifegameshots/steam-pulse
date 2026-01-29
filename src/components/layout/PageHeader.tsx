'use client';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  pageName?: string;
}

export function PageHeader({ title, description, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        {icon}
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
