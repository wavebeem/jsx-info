const cache = new Map();

function getLines(code) {
  let lines = cache.get(code);
  if (lines) {
    return lines;
  }
  lines = code.split(/\r?\n/);
  cache.set(code, lines);
  return lines;
}

function formatPrettyCode(code, startLine, endLine) {
  const output = [];
  const lines = getLines(code);
  const maxDigits = Math.max(
    String(startLine).length,
    String(endLine).length,
    4
  );
  for (let lineno = startLine; lineno <= endLine; lineno++) {
    output.push(String(lineno).padStart(maxDigits) + " | " + lines[lineno - 1]);
  }
  return output.join("\n");
}

exports.formatPrettyCode = formatPrettyCode;
