import { Card } from "@/components/ui/card";
import { Sparkles, AlertOctagon, GitBranch, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";
type InsightTone = "red" | "amber" | "sand";
interface TrafficInsight {
  headline: string;
  bottleneck: string;
  rootCause: string;
  recommendation: string;
}
interface AiInsightsProps {
  insight: TrafficInsight;
  period: string;
}
interface InsightBlockProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: InsightTone;
}
const toneStyle: Record<InsightTone, string> = {
  red: "text-red-500 bg-red-500/10",
  amber: "text-amber-500 bg-amber-500/10",
  sand: "sand-text bg-[hsl(var(--sand))]/10",
};
function InsightBlock({ icon: Icon, label, value, tone }: InsightBlockProps) {
  return (
    <div className="p-3.5 rounded-xl border border-border/60 bg-background/40 fade-in-up">
      {" "}
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest ${toneStyle[tone]}`}
      >
        {" "}
        <Icon className="w-3 h-3" /> {label}{" "}
      </div>{" "}
      <p className="mt-2 text-sm text-foreground/90 leading-relaxed">
        {" "}
        {value}{" "}
      </p>{" "}
    </div>
  );
}
export default function AiInsights({ insight, period }: AiInsightsProps) {
  return (
    <Card
      data-testid="ai-traffic-insights-panel"
      className="relative overflow-hidden bg-card/70 glass sand-border card-elev p-5 md:p-6"
    >
      {" "}
      <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full sand-bg/10 blur-3xl opacity-60" />{" "}
      <div className="relative">
        {" "}
        <div className="flex items-center gap-2 mb-1">
          {" "}
          <div className="w-7 h-7 rounded-lg sand-bg/20 sand-border flex items-center justify-center">
            {" "}
            <Sparkles className="w-3.5 h-3.5 sand-text" />{" "}
          </div>{" "}
          <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {" "}
            AI Mobility Analyst{" "}
          </span>{" "}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/50 border border-border/60">
            {" "}
            {period}{" "}
          </span>{" "}
        </div>{" "}
        <h2 className="font-display text-lg md:text-xl font-semibold mt-2 leading-snug fade-in-up">
          {" "}
          {insight.headline}{" "}
        </h2>{" "}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {" "}
          <InsightBlock
            icon={AlertOctagon}
            label="Top Bottleneck"
            value={insight.bottleneck}
            tone="red"
          />{" "}
          <InsightBlock
            icon={GitBranch}
            label="Root Cause"
            value={insight.rootCause}
            tone="amber"
          />{" "}
          <InsightBlock
            icon={Lightbulb}
            label="Recommendation"
            value={insight.recommendation}
            tone="sand"
          />{" "}
        </div>{" "}
      </div>{" "}
    </Card>
  );
}
