import { PipelineStage } from "@prisma/client";
import { Check } from "lucide-react";
import { pipelineStages, stageDescriptions } from "@/lib/constants";
import { formatEnumLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PipelineStepper({ stage }: { stage: PipelineStage }) {
  const currentIndex = pipelineStages.indexOf(stage);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-900">Pipeline</p>
        <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          {formatEnumLabel(stage)}
        </span>
      </div>

      <div className="relative">
        {/* Track */}
        <div className="absolute left-[10%] right-[10%] top-4 h-px bg-zinc-200" />
        {/* Progress fill */}
        <div
          className="absolute left-[10%] top-4 h-px bg-indigo-600 transition-all duration-700 ease-out"
          style={{ width: `${currentIndex * 20}%` }}
        />

        <div className="relative grid grid-cols-5 gap-2">
          {pipelineStages.map((item, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = item === stage;

            return (
              <div key={item} className="flex flex-col items-center gap-2.5">
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isComplete && "border-indigo-600 bg-indigo-600 text-white",
                    isCurrent && "border-indigo-600 bg-white shadow-glow",
                    !isComplete && !isCurrent && "border-zinc-300 bg-white"
                  )}
                >
                  {isComplete ? (
                    <Check size={13} strokeWidth={2.5} className="text-white" />
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        isCurrent ? "text-indigo-600" : "text-zinc-400"
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                <div className="text-center">
                  <p
                    className={cn(
                      "text-xs font-medium leading-tight",
                      isCurrent
                        ? "text-zinc-900"
                        : isComplete
                          ? "text-zinc-600"
                          : "text-zinc-400"
                    )}
                  >
                    {formatEnumLabel(item)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current stage description */}
      <p className="mt-4 text-xs text-zinc-500">{stageDescriptions[stage]}</p>
    </div>
  );
}
