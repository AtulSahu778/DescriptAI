/**
 * Reads a streaming response from the generate API and extracts the final JSON result.
 * The API streams raw tokens, then appends __RESULT__:{json} or __ERROR__:message at the end.
 */
export async function parseGenerateStream(
  response: Response
): Promise<{ seo: string; emotional: string; short: string; credits_remaining?: number }> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }

  // Check for error marker
  const errorMatch = fullText.match(/__ERROR__:(.*)/);
  if (errorMatch) {
    throw new Error(errorMatch[1]);
  }

  // Check for result marker
  const resultMatch = fullText.match(/__RESULT__:(.*)/);
  if (resultMatch) {
    return JSON.parse(resultMatch[1]);
  }

  // Fallback: try to parse the raw streamed content as JSON
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("Failed to parse AI response");
}
