import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function GameCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[460/215] w-full" />
      <CardContent className="p-3">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="flex justify-between items-center mt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}