"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bullet } from "@/components/ui/bullet";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Mission } from "@/types/dashboard";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  Gift,
  Ticket,
  Trophy,
  Check,
  Sparkles,
  Hammer,
} from "lucide-react";

interface MissionsProps {
  initialMissions: Mission[];
}

const REWARD_ICON: Record<Mission["rewardType"], React.ElementType> = {
  gift: Gift,
  cash: Banknote,
  voucher: Ticket,
};

function formatDeadline(deadline?: string) {
  if (!deadline) return null;
  const d = new Date(`${deadline}T00:00:00`);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "Đã hết hạn";
  if (days === 0) return "Hết hạn hôm nay";
  if (days === 1) return "Còn 1 ngày";
  return `Còn ${days} ngày`;
}

function MissionRow({
  mission,
  onClaim,
}: {
  mission: Mission;
  onClaim: (id: string) => void;
}) {
  const RewardIcon = REWARD_ICON[mission.rewardType];
  const pct = Math.min(100, Math.round((mission.current / mission.target) * 100));
  const isClaimed = mission.status === "claimed";
  const isCompleted = mission.status === "completed";
  const deadlineLabel = formatDeadline(mission.deadline);

  return (
    <div
      className={cn(
        "rounded-md bg-card p-3 ring-1 ring-border/60 transition-colors",
        isClaimed && "opacity-60",
        isCompleted && "ring-success/40",
      )}
    >
      {/* Header: product + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-base leading-tight">
            {mission.productModel}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <RewardIcon className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{mission.reward}</span>
          </div>
        </div>

        {isClaimed ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <Check className="size-3" />
            ĐÃ NHẬN
          </Badge>
        ) : isCompleted ? (
          <Badge className="shrink-0 bg-success text-background">HOÀN THÀNH</Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0">
            {mission.current}/{mission.target}
          </Badge>
        )}
      </div>

      {/* Progress */}
      <div className="mt-3 space-y-1.5">
        <Progress
          value={pct}
          className={cn(
            "h-2",
            (isCompleted || isClaimed) && "[&_[data-slot=progress-indicator]]:bg-success",
          )}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            <span className="font-mono text-foreground">{mission.current}</span> /{" "}
            {mission.target} đã bán
          </span>
          {deadlineLabel && <span>{deadlineLabel}</span>}
        </div>
      </div>

      {/* Claim action */}
      {isCompleted && (
        <Button
          size="sm"
          className="mt-3 w-full gap-1.5 bg-success text-background hover:bg-success/90"
          onClick={() => onClaim(mission.id)}
        >
          <Sparkles className="size-3.5" />
          Nhận quà
        </Button>
      )}
    </div>
  );
}

export default function Missions({ initialMissions }: MissionsProps) {
  const [missions, setMissions] = useState<Mission[]>(initialMissions);

  const claim = (id: string) =>
    setMissions((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "claimed" } : m)),
    );

  const doneCount = missions.filter(
    (m) => m.status === "completed" || m.status === "claimed",
  ).length;

  // Sắp xếp: hoàn thành (chờ nhận) → đang chạy → đã nhận
  const order: Record<Mission["status"], number> = {
    completed: 0,
    active: 1,
    claimed: 2,
  };
  const sorted = [...missions].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <Card className="relative flex h-full flex-col overflow-hidden">
      {/* Overlay: tính năng đang cập nhật — khoá toàn bộ tương tác */}
      <div
        aria-hidden
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/70 text-center backdrop-blur-sm"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Hammer className="size-6" />
        </div>
        <div>
          <div className="font-display text-lg leading-tight">Đang cập nhật</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Tính năng Nhiệm vụ sẽ sớm ra mắt
          </div>
        </div>
        <Badge variant="secondary" className="uppercase">
          Coming soon
        </Badge>
      </div>

      {/* Nội dung thật bị khoá click + làm mờ phía dưới overlay */}
      <div
        className="pointer-events-none flex h-full select-none flex-col opacity-60"
        aria-disabled
      >
      <CardHeader className="flex items-center justify-between pl-3 pr-1.5">
        <CardTitle className="flex items-center gap-2.5 text-sm font-medium uppercase">
          <Trophy className="size-4 text-primary" />
          Nhiệm vụ
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {doneCount}/{missions.length} hoàn thành
        </span>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto bg-accent p-1.5">
        <div className="space-y-2">
          <AnimatePresence initial={false} mode="popLayout">
            {sorted.map((mission) => (
              <motion.div
                layout
                key={mission.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <MissionRow mission={mission} onClaim={claim} />
              </motion.div>
            ))}
          </AnimatePresence>

          {missions.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Chưa có nhiệm vụ nào
            </div>
          )}
        </div>
      </CardContent>
      </div>
    </Card>
  );
}
