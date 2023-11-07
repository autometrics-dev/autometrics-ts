const decoder = new TextDecoder("utf8");

/**
 * Parses the `.git/config` file to extract the repository URL.
 *
 * For documentation of the file format, see: https://git-scm.com/docs/git-config#_configuration_file
 */
export function getGitRepositoryUrl(gitConfig: Uint8Array): string | undefined {
  const lines = decoder.decode(gitConfig).split("\n");

  let section = "";
  let subsection = "";
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments:
    if (
      trimmedLine.length === 0 ||
      trimmedLine.startsWith("#") ||
      trimmedLine.startsWith(";")
    ) {
      continue;
    }

    // Detect section start:
    if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
      const firstQuoteIndex = trimmedLine.indexOf('"', 3);
      const lastQuoteIndex =
        firstQuoteIndex === -1 ? -1 : trimmedLine.lastIndexOf('"');

      section = trimmedLine.slice(1, firstQuoteIndex).trim().toLowerCase();
      subsection =
        lastQuoteIndex > firstQuoteIndex
          ? unquote(trimmedLine.slice(firstQuoteIndex, lastQuoteIndex + 1))
          : "";
      continue;
    }

    // This is the only section we care about:
    if (section !== "remote" || subsection !== "origin") {
      continue;
    }

    const equalIndex = trimmedLine.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    // Look for the URL declaration:
    const name = trimmedLine.slice(0, equalIndex).trim().toLowerCase();
    if (name === "url") {
      return unquote(trimmedLine.slice(equalIndex + 1).trim());
    }
  }
}

function unquote(maybeQuotedValue: string): string {
  if (maybeQuotedValue.startsWith('"') && maybeQuotedValue.endsWith('"')) {
    return maybeQuotedValue
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  return maybeQuotedValue;
}

/**
 * Parses the `package.json` file to extract a string field.
 */
export function getPackageStringField(
  packageJson: Uint8Array,
  fieldName: string,
): string | undefined {
  const json = JSON.parse(decoder.decode(packageJson));
  return typeof json[fieldName] === "string" ? json[fieldName] : undefined;
}
