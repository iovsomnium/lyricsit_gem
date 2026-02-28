"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Trash2, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { SavedLyricsMemo } from "@/types";

interface MemoCardProps {
  memo: SavedLyricsMemo;
  onDelete: (id: string) => void;
  onCheckSimilarity: (id: string) => void;
  isCheckingNow: boolean;
}

export function MemoCard({
  memo,
  onDelete,
  onCheckSimilarity,
  isCheckingNow,
}: MemoCardProps) {
  const [showActions, setShowActions] = useState(false);

  const previewLines = memo.content
    .split("\n")
    .filter(Boolean)
    .slice(0, 3);

  const hasHighSimilarity =
    memo.metadata.hasBeenChecked &&
    memo.metadata.lastCheckResults?.some((result) => result.similarityScore >= 0.7);

  const timeAgo = formatTimeAgo(memo.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-foreground">
              {memo.title}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
          </div>

          {hasHighSimilarity && (
            <Badge variant="warning" className="shrink-0">
              Warning
            </Badge>
          )}
        </div>

        {/* Preview */}
        <div className="px-3 py-2">
          {previewLines.map((line, index) => (
            <p
              key={index}
              className="truncate text-sm leading-relaxed text-foreground/80"
            >
              {line}
            </p>
          ))}
          {memo.content.split("\n").filter(Boolean).length > 3 && (
            <p className="mt-1 text-xs text-muted">...</p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
          {memo.metadata.genre && (
            <Badge variant="muted" className="text-xs">
              {memo.metadata.genre}
            </Badge>
          )}
          {memo.metadata.mood && (
            <Badge variant="muted" className="text-xs">
              {memo.metadata.mood}
            </Badge>
          )}
          <Badge variant="muted" className="text-xs">
            {memo.metadata.lineCount} lines
          </Badge>
        </div>

        {/* Actions */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center gap-2 bg-surface/95 backdrop-blur-sm"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCheckSimilarity(memo.id)}
              disabled={isCheckingNow}
            >
              <Shield className="h-4 w-4" />
              {isCheckingNow ? "Checking..." : "Similarity Check"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(memo.id)}
            >
              <Trash2 className="h-4 w-4 text-warning-red" />
              Delete
            </Button>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
