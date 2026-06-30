import { z } from "zod";

export const shirtSizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL"] as const;
export const initialsLanguages = ["RU", "UA", "EN"] as const;

export const submissionSchema = z.object({
  participantSlug: z.string().min(1),
  firstName: z.string().trim().min(2).max(32),
  lastName: z.string().trim().min(2).max(32),
  size: z.enum(shirtSizes),
  initialsLanguage: z.enum(initialsLanguages).default("RU"),
  backNameAssetPath: z.string().trim().max(180).default(""),
  backNameFirstName: z.string().trim().min(1).max(40),
  backNameLastName: z.string().trim().min(1).max(40),
  backNameText: z.string().trim().min(2).max(90),
  words: z
    .array(z.string().trim().min(1).max(20))
    .length(3)
    .transform((words) => words as [string, string, string]),
  clientSubmissionId: z.string().trim().min(6).max(80).optional(),
});
