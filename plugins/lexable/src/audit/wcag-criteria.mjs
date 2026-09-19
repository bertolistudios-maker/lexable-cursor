/** WCAG 2.2 success criteria referenced by this plugin. Do not invent IDs. */
export const WCAG22_CRITERIA = {
  "1.1.1": { level: "A", handle: "Non-text Content" },
  "1.3.1": { level: "A", handle: "Info and Relationships" },
  "1.3.5": { level: "AA", handle: "Identify Input Purpose" },
  "1.4.2": { level: "A", handle: "Audio Control" },
  "2.1.1": { level: "A", handle: "Keyboard" },
  "2.1.2": { level: "A", handle: "No Keyboard Trap" },
  "2.4.2": { level: "A", handle: "Page Titled" },
  "2.4.3": { level: "A", handle: "Focus Order" },
  "2.4.4": { level: "A", handle: "Link Purpose (In Context)" },
  "2.4.6": { level: "AA", handle: "Headings and Labels" },
  "2.4.7": { level: "AA", handle: "Focus Visible" },
  "2.4.11": { level: "AA", handle: "Focus Not Obscured (Minimum)" },
  "2.5.3": { level: "A", handle: "Label in Name" },
  "2.5.8": { level: "AA", handle: "Target Size (Minimum)" },
  "3.1.1": { level: "A", handle: "Language of Page" },
  "3.3.1": { level: "A", handle: "Error Identification" },
  "3.3.2": { level: "A", handle: "Labels or Instructions" },
  "4.1.2": { level: "A", handle: "Name, Role, Value" },
  "4.1.3": { level: "AA", handle: "Status Messages" },
};

export function criterion(id) {
  const meta = WCAG22_CRITERIA[id];
  if (!meta) {
    return null;
  }
  return { id, ...meta };
}
