"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MemoCard } from "./MemoCard";

export function SavedMemosPanel() {
  const savedMemos = useAppStore((s) => s.savedMemos);
  const deleteMemo = useAppStore((s) => s.deleteMemo);
  const clearAllMemos = useAppStore((s) => s.clearAllMemos);
  const checkMemoSimilarity = useAppStore((s) => s.checkMemoSimilarity);
  const isCheckingSimilarity = useAppStore((s) => s.isCheckingSimilarity);

  const handleClearAll = () => {
    if (savedMemos.length === 0) return;
    if (window.confirm("Delete all saved lyrics?")) {
      clearAllMemos();
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Saved Lyrics ({savedMemos.length})</CardTitle>
          {savedMemos.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-warning-red hover:bg-warning-red-light"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {savedMemos.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-muted">No saved lyrics yet.</p>
              <p className="mt-1 text-xs text-muted/70">
                Generate lyrics and save your draft to see it here.
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            className="flex flex-col gap-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
          >
            <AnimatePresence>
              {savedMemos.map((memo) => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  onDelete={deleteMemo}
                  onCheckSimilarity={checkMemoSimilarity}
                  isCheckingNow={isCheckingSimilarity}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </Card>
  );
}
