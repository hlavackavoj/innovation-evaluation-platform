import { ProjectStage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { pipelineStages, stageDescriptions } from "@/lib/constants";
import { formatEnumLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PipelineStepper({ stage }: { stage: ProjectStage }) {
  const currentIndex = pipelineStages.indexOf(stage);
  const progressValue = ((currentIndex + 1) / pipelineStages.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Pipeline Progress</CardTitle>
            <CardDescription>{stageDescriptions[stage]}</CardDescription>
          </div>
          <Badge className="bg-teal-100 text-teal-800">{formatEnumLabel(stage)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progressValue} />
        <div className="grid gap-4 md:grid-cols-5">
          {pipelineStages.map((item, index) => {
            const isComplete = index <= currentIndex;
            const isCurrent = item === stage;

            return (
              <div key={item} className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    isComplete
                      ? "border-tealCore bg-tealCore text-white"
                      : "border-slate-300 bg-white text-slate-500"
                  )}
                >
                  {index + 1}
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", isCurrent ? "text-ink" : "text-slate-600")}>
                    {formatEnumLabel(item)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{stageDescriptions[item]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
