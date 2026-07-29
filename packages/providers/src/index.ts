import { z } from "zod";

export const TranslationAssessmentSchema = z.object({
  severity: z.enum(["blocking", "warning", "advisory"]),
  confidence: z.enum([
    "high confidence",
    "medium confidence",
    "low confidence",
    "human review required",
  ]),
  sourceText: z.string(),
  targetText: z.string(),
  backTranslation: z.string(),
  reason: z.string(),
  recommendedRevision: z.string(),
  humanReviewRequired: z.boolean(),
  evidence: z.array(z.string()),
});

export type ProviderRequest = {
  sourceLocale: string;
  targetLocale: string;
  sourceText: string;
  targetText?: string;
  context?: string;
  protectedTerms?: string[];
};

export interface LinguisticProvider {
  id: string;
  status(): Promise<{ available: boolean; reason?: string }>;
  evaluateTranslation(
    request: ProviderRequest,
  ): Promise<z.infer<typeof TranslationAssessmentSchema>>;
  generateTranslation(request: ProviderRequest): Promise<{ translation: string }>;
  backTranslate(request: ProviderRequest): Promise<{ translation: string }>;
  explainIssue(request: ProviderRequest): Promise<{ explanation: string }>;
  suggestRepair(request: ProviderRequest): Promise<{ revision: string }>;
  classifyConfidence(request: ProviderRequest): Promise<{ confidence: string }>;
}

export class NoModelProvider implements LinguisticProvider {
  id = "deterministic";
  async status() {
    return {
      available: true,
      reason: "No-model mode uses deterministic checks only.",
    };
  }
  private unavailable(): never {
    throw new Error(
      "Model-assisted operation is unavailable in --no-ai mode; deterministic checks remain active.",
    );
  }
  async evaluateTranslation(): Promise<never> {
    return this.unavailable();
  }
  async generateTranslation(): Promise<never> {
    return this.unavailable();
  }
  async backTranslate(): Promise<never> {
    return this.unavailable();
  }
  async explainIssue(): Promise<never> {
    return this.unavailable();
  }
  async suggestRepair(): Promise<never> {
    return this.unavailable();
  }
  async classifyConfidence(): Promise<never> {
    return this.unavailable();
  }
}

export class ProviderRouter {
  constructor(
    private readonly providers: LinguisticProvider[],
    private readonly timeoutMs = 12_000,
  ) {}

  async firstAvailable() {
    for (const provider of this.providers) {
      const status = await provider.status();
      if (status.available) return provider;
    }
    throw new Error("No linguistic provider is available.");
  }

  async withTimeout<T>(operation: (provider: LinguisticProvider) => Promise<T>) {
    const provider = await this.firstAvailable();
    return Promise.race([
      operation(provider),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Provider ${provider.id} timed out`)),
          this.timeoutMs,
        ),
      ),
    ]);
  }
}
