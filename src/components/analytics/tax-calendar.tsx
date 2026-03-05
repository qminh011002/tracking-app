import { useMemo } from "react";
import DashboardCard from "@/components/dashboard/card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bullet } from "@/components/ui/bullet";
import { Checkbox } from "@/components/ui/checkbox";
import InfoHint from "./info-hint";
import {
  getTaxCalendar2026,
  getComplianceChecklist,
  type TaxDeadline,
} from "@/src/lib/tax-calculator";

function getDeadlineStatus(dueDate: string): "overdue" | "upcoming" | "ok" {
  const now = new Date();
  const due = new Date(dueDate + "T23:59:59");
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "upcoming";
  return "ok";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function daysUntil(dateStr: string) {
  const now = new Date();
  const due = new Date(dateStr + "T23:59:59");
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineItem({ deadline }: { deadline: TaxDeadline }) {
  const status = getDeadlineStatus(deadline.dueDate);
  const days = daysUntil(deadline.dueDate);

  const bulletVariant = status === "overdue" ? "destructive" : status === "upcoming" ? "warning" : "success";

  return (
    <div className="flex items-start gap-3 py-2.5 px-1 border-b border-border/30 last:border-b-0">
      <Bullet variant={bulletVariant} className="mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{deadline.title}</span>
          <Badge
            variant={deadline.type === "vat" ? "default" : deadline.type === "pit" ? "secondary" : "outline"}
            className="text-[9px] px-1.5 uppercase"
          >
            {deadline.type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{deadline.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-display">{formatDate(deadline.dueDate)}</span>
          {status === "overdue" ? (
            <Badge variant="destructive" className="text-[9px]">OVERDUE {Math.abs(days)} DAYS</Badge>
          ) : status === "upcoming" ? (
            <Badge variant="outline-warning" className="text-[9px]">{days} DAYS LEFT</Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground">{days} days left</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaxCalendar() {
  const deadlines = useMemo(() => getTaxCalendar2026(), []);
  const checklist = useMemo(() => getComplianceChecklist(), []);

  const grouped = useMemo(() => {
    const groups: Record<number, TaxDeadline[]> = {};
    for (const d of deadlines) {
      if (!groups[d.quarter]) groups[d.quarter] = [];
      groups[d.quarter].push(d);
    }
    return groups;
  }, [deadlines]);

  const overdueCount = deadlines.filter((d) => getDeadlineStatus(d.dueDate) === "overdue").length;
  const upcomingCount = deadlines.filter((d) => getDeadlineStatus(d.dueDate) === "upcoming").length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="relative overflow-hidden">
          <CardContent className="bg-accent pt-4">
            <div className="flex items-center gap-2">
              <Bullet variant="destructive" />
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Overdue</span>
            </div>
            <div className="font-display text-3xl mt-1">{overdueCount}</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="bg-accent pt-4">
            <div className="flex items-center gap-2">
              <Bullet variant="warning" />
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Due soon</span>
            </div>
            <div className="font-display text-3xl mt-1">{upcomingCount}</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="bg-accent pt-4">
            <div className="flex items-center gap-2">
              <Bullet variant="success" />
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Total deadlines</span>
            </div>
            <div className="font-display text-3xl mt-1">{deadlines.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline by Quarter */}
        <DashboardCard
          title="2026 TAX CALENDAR"
          addon={<InfoHint text="Quarter-based filing timeline with deadline status (overdue, upcoming, on track)." />}
        >
          <div className="space-y-5">
            {[1, 2, 3, 4].map((q) => (
              <div key={q}>
                <div className="flex items-center gap-2 mb-2">
                  <Bullet />
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Quarter {q}/2026
                  </span>
                </div>
                <div className="bg-accent rounded-lg px-3">
                  {(grouped[q] ?? []).map((d) => (
                    <DeadlineItem key={d.id} deadline={d} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Compliance Checklist */}
        <DashboardCard
          title="COMPLIANCE CHECKLIST"
          intent="success"
          addon={<InfoHint text="Operational checklist to keep tax compliance tasks visible and trackable." />}
        >
          <div className="space-y-1">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2.5 px-1 border-b border-border/30 last:border-b-0">
                <Checkbox id={item.id} className="mt-0.5" />
                <div>
                  <label htmlFor={item.id} className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                    {item.title}
                    {item.required && (
                      <Badge variant="destructive" className="text-[9px] px-1 uppercase">Required</Badge>
                    )}
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
