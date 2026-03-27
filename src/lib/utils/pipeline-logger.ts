interface StepLog {
  name: string;
  status: "running" | "success" | "error";
  data?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface PipelineLog {
  steps: StepLog[];
  step(name: string): void;
  success(name: string, data?: Record<string, unknown>): void;
  error(name: string, err: unknown): void;
  hasErrors(): boolean;
  summary(): { totalSteps: number; errors: number; steps: StepLog[] };
}

export function createPipelineLog(): PipelineLog {
  const steps: StepLog[] = [];

  return {
    steps,
    step(name: string) {
      steps.push({
        name,
        status: "running",
        startedAt: new Date().toISOString(),
      });
    },
    success(name: string, data?: Record<string, unknown>) {
      const step = steps.find((s) => s.name === name && s.status === "running");
      if (step) {
        step.status = "success";
        step.data = data;
        step.completedAt = new Date().toISOString();
      }
    },
    error(name: string, err: unknown) {
      const step = steps.find((s) => s.name === name && s.status === "running");
      if (step) {
        step.status = "error";
        step.error =
          err instanceof Error ? err.message : String(err);
        step.completedAt = new Date().toISOString();
      }
    },
    hasErrors() {
      return steps.some((s) => s.status === "error");
    },
    summary() {
      return {
        totalSteps: steps.length,
        errors: steps.filter((s) => s.status === "error").length,
        steps,
      };
    },
  };
}
