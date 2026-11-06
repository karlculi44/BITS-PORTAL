export const TOOLTIP_ID = "app-tooltip";

// Spread onto any element to show the shared tooltip, e.g. {...tooltip("Close")}
export const tooltip = (content, place = "top") => ({
  "data-tooltip-id": TOOLTIP_ID,
  "data-tooltip-content": content,
  "data-tooltip-place": place,
});
