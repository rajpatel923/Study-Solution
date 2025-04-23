"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionUrl,
  className
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50",
        className
      )}
    >
      <div className="bg-blue-100 p-3 rounded-full mb-4">
        <FileText className="h-8 w-8 text-blue-600" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {title}
      </h3>
      
      <p className="text-gray-500 max-w-md mb-6">
        {description}
      </p>
      
      {actionLabel && actionUrl && (
        <Link href={actionUrl}>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}