import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';

interface GameCardProps {
  id: number;
  name: string;
  image: string;
  price?: {
    final: number;
    discount_percent: number;
    currency: string;
  } | null;
  ccu?: number;
  showCCU?: boolean;
}

export default function GameCard({
  id,
  name,
  image,
  price,
  ccu,
  showCCU = false,
}: GameCardProps) {
  const formatPrice = (cents: number, currency: string) => {
    if (cents === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100);
  };

  const formatCCU = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Link href={`/game/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative aspect-[460/215]">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {price && price.discount_percent > 0 && (
            <Badge className="absolute top-2 right-2 bg-green-600">
              -{price.discount_percent}%
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm line-clamp-1" title={name}>
            {name}
          </h3>
          <div className="flex justify-between items-center mt-2">
            {price ? (
              <span className="text-sm font-medium">
                {formatPrice(price.final, price.currency)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
            {showCCU && ccu !== undefined && (
              <Badge variant="outline" className="text-xs">
                👥 {formatCCU(ccu)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}