'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import { DataSourceModal } from './DataSourceModal';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  pageName: string;
}

export function PageHeader({ title, description, icon, pageName }: PageHeaderProps) {
  const [dataSourceOpen, setDataSourceOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
          onClick={() => setDataSourceOpen(true)}
        >
          <Database className="h-3.5 w-3.5" />
          데이터 기준
        </Button>
      </div>

      <DataSourceModal
        open={dataSourceOpen}
        onOpenChange={setDataSourceOpen}
        pageName={pageName}
      />
    </>
  );
}
