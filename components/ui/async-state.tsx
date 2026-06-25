"use client";

import { AlertCircle, CheckCircle2, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type AsyncStateMode = "loading" | "success" | "error" | "empty";

interface AsyncStateProps {
  mode: AsyncStateMode;
  title: string;
  description?: string;
  progress?: number | null;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const modeStyles: Record<AsyncStateMode, string> = {
  loading: "border-slate-200 bg-slate-50",
  success: "border-emerald-200 bg-emerald-50",
  error: "border-red-200 bg-red-50",
  empty: "border-amber-200 bg-amber-50",
};

function AsyncStateIcon(props: { mode: AsyncStateMode }) {
  if (props.mode === "loading") {
    return <Loader2 className="h-5 w-5 animate-spin text-slate-600" />;
  }
  if (props.mode === "success") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  }
  if (props.mode === "error") {
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  }
  return <Inbox className="h-5 w-5 text-amber-600" />;
}

export function AsyncState(props: AsyncStateProps) {
  return (
    <Card className={modeStyles[props.mode]}>
      <CardHeader className={props.compact ? "pb-2" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <AsyncStateIcon mode={props.mode} />
          <span>{props.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.description ? <p className="text-sm text-slate-700">{props.description}</p> : null}
        {typeof props.progress === "number" ? <Progress value={props.progress} className="h-2" /> : null}
        {props.actionLabel && props.onAction ? (
          <Button type="button" variant="outline" onClick={props.onAction} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {props.actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
