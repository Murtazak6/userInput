export const processUrl = (url, idValues = {}) => {
  if (typeof url !== 'string') {
    return null;
  }

  const variables = Array.from(url.matchAll(/{(\w+)}/g)).map(m => m[1]);
  const allPresent = variables.every(key => idValues[key] !== undefined);
  if (!allPresent) {
    return null;
  }
  return url.replace(/{(\w+)}/g, (_, key) => idValues[key]);
};

export function numberToWords(num) {
  if (num === 0) return "Zero";

  const belowTwenty = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const units = ["", "Thousand", "Lakh", "Crore"];

  function twoDigits(n) {
    if (n < 20) return belowTwenty[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + belowTwenty[n % 10] : "");
  }

  function threeDigits(n) {
    if (n === 0) return "";
    if (n < 100) return twoDigits(n);
    return (
      belowTwenty[Math.floor(n / 100)] + " Hundred" +
      (n % 100 ? " " + twoDigits(n % 100) : "")
    );
  }

  const parts = [];
  let remainder = num % 1000;
  if (remainder > 0) parts.push(threeDigits(remainder));
  num = Math.floor(num / 1000);

  const labels = ["Thousand", "Lakh", "Crore"];
  let i = 0;

  while (num > 0 && i < labels.length) {
    let part = num % 100;
    if (part > 0) parts.push(twoDigits(part) + " " + labels[i]);
    num = Math.floor(num / 100);
    i++;
  }

  return parts.reverse().join(" ").trim();
}
export const evaluateTemplate = (template, data) => {
  if (typeof template === "string") {
    return template.replace(/\{\{(.*?)\}\}/g, (_, match) => {
      try {
        const func = new Function("context", `with(context) { return ${match}; }`);
        return func(data);
      } catch (e) {
        console.error("Template eval error:", e);
        return "";
      }
    });
  }
  return template;
};