"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionUrl?: string;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  actionLabel,
  actionUrl,
  className
}: PageHeaderProps) {
  return (
    <div 
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
          {title}
        </h1>
        {description && (
          <p className="text-gray-500 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actionLabel && actionUrl && (
        <div className="mt-4 md:mt-0 flex-shrink-0">
          <Link href={actionUrl}>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {actionLabel}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}