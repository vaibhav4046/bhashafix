import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

export const ProjectConfigSchema = z.object({
  sourceLocale: z.string().min(2),
  locales: z.array(z.string().min(2)).min(1),
  routes: z.array(z.string().startsWith("/")).min(1),
  browsers: z
    .array(z.enum(["chromium", "firefox", "webkit"]))
    .default(["chromium"]),
  viewports: z
    .array(z.enum(["mobile", "tablet", "desktop", "narrow"]))
    .default(["mobile", "desktop"]),
  themes: z.array(z.enum(["light", "dark"])).default(["light", "dark"]),
  severity: z.enum(["blocking", "warning", "advisory"]).default("blocking"),
  noAi: z.boolean().default(true),
  crawl: z
    .object({
      maxPages: z.number().int().min(1).max(100).default(20),
      maxDepth: z.number().int().min(0).max(5).default(2),
      rateLimitPerSecond: z.number().positive().max(10).default(2),
      respectRobots: z.boolean().default(true),
    })
    .default({}),
  repair: z.object({ allowlist: z.array(z.string()).default([]) }).default({}),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export async function loadProjectConfig(
  projectRoot: string,
  relativePath = ".bhashafix/config.yml",
) {
  const file = path.resolve(projectRoot, relativePath);
  const parsed = YAML.parse(await readFile(file, "utf8"));
  return ProjectConfigSchema.parse(parsed);
}
