export type BrandVoice = {
  id: string;
  user_id: string;
  name: string;
  tone_adjectives: string[];
  writing_samples: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export function buildBrandVoicePrompt(voice: BrandVoice): string {
  const parts: string[] = [];

  parts.push(`\n## Brand Voice: "${voice.name}"`);

  if (voice.tone_adjectives.length > 0) {
    parts.push(`Tone: ${voice.tone_adjectives.join(", ")}`);
  }

  if (voice.writing_samples.length > 0) {
    parts.push("Match the style of these writing samples:");
    voice.writing_samples.forEach((sample, i) => {
      parts.push(`Sample ${i + 1}: "${sample}"`);
    });
  }

  parts.push(
    "Apply this brand voice consistently across all generated descriptions. " +
    "The tone, vocabulary, and style should closely mirror the provided samples."
  );

  return parts.join("\n");
}
