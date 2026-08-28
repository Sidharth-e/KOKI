export interface ParsedDocument {
  name: string;
  size: number;
  type: string;
  content: string;
  pageCount?: number;
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const arrayBuffer = await file.arrayBuffer();

  let extractedText = "";

  try {
    switch (extension) {
      case "docx":
      case "docm":
      case "dotx":
        extractedText = await parseDocxFromBuffer(arrayBuffer);
        break;

      case "pptx":
      case "pptm":
      case "potx":
        extractedText = await parsePptxFromBuffer(arrayBuffer);
        break;

      case "xlsx":
      case "xlsm":
      case "xltx":
        extractedText = await parseXlsxFromBuffer(arrayBuffer);
        break;

      case "odt":
      case "ods":
      case "odp":
        extractedText = await parseOdfFromBuffer(arrayBuffer);
        break;

      case "epub":
        extractedText = await parseEpubFromBuffer(arrayBuffer);
        break;

      case "pdf":
        extractedText = await parsePdf(arrayBuffer);
        break;

      case "html":
      case "htm":
      case "xhtml":
        extractedText = parseHtmlText(new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer));
        break;

      case "rtf":
        extractedText = parseRtfText(new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer));
        break;

      case "json":
        extractedText = parseJsonText(new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer));
        break;

      case "csv":
      case "tsv":
        extractedText = parseCsvText(new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer));
        break;

      case "txt":
      case "md":
      case "markdown":
      case "rst":
      case "org":
      case "log":
      case "yaml":
      case "yml":
      case "xml":
      case "toml":
      case "ini":
      case "env":
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "py":
      case "rs":
      case "go":
      case "java":
      case "c":
      case "cpp":
      case "h":
      case "hpp":
      case "cs":
      case "rb":
      case "php":
      case "sh":
      case "bash":
      case "zsh":
      case "sql":
      case "graphql":
      case "dockerfile":
        extractedText = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
        break;

      default:
        extractedText = await parseGenericOrBinary(arrayBuffer);
        break;
    }
  } catch {
    extractedText = await parseGenericOrBinary(arrayBuffer);
  }

  const cleanText = extractedText.replace(/\r\n/g, "\n").trim();

  return {
    name: file.name,
    size: file.size,
    type: extension || "document",
    content: cleanText.length > 0 ? cleanText : "[No readable text found in document]",
  };
}

async function decompressDeflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const decompressedStream = new Response(new Uint8Array(compressed)).body?.pipeThrough(
    new DecompressionStream("deflate-raw")
  );
  if (!decompressedStream) {
    return compressed;
  }
  const buffer = await new Response(decompressedStream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function decompressZlib(compressed: Uint8Array): Promise<Uint8Array> {
  try {
    const decompressedStream = new Response(new Uint8Array(compressed)).body?.pipeThrough(
      new DecompressionStream("deflate")
    );
    if (!decompressedStream) {
      return compressed;
    }
    const buffer = await new Response(decompressedStream).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    const rawData = compressed.length > 2 ? compressed.slice(2) : compressed;
    return await decompressDeflateRaw(rawData);
  }
}

async function extractZipEntries(bytes: Uint8Array): Promise<Map<string, string>> {
  const entries = new Map<string, string>();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  while (offset + 30 <= bytes.byteLength) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraFieldLength = view.getUint16(offset + 28, true);

    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > bytes.byteLength) break;

    const fileNameBytes = bytes.slice(nameStart, nameEnd);
    const fileName = new TextDecoder("utf-8", { fatal: false }).decode(fileNameBytes);

    const dataStart = nameEnd + extraFieldLength;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd <= bytes.byteLength) {
      const compressedData = bytes.slice(dataStart, dataEnd);
      try {
        if (compressionMethod === 0) {
          entries.set(fileName, new TextDecoder("utf-8", { fatal: false }).decode(compressedData));
        } else if (compressionMethod === 8) {
          const decompressed = await decompressDeflateRaw(compressedData);
          entries.set(fileName, new TextDecoder("utf-8", { fatal: false }).decode(decompressed));
        }
      } catch {}
    }

    offset = dataEnd > offset ? dataEnd : offset + 30;
  }

  return entries;
}

async function parseDocxFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const entries = await extractZipEntries(bytes);
  const xmlContent = entries.get("word/document.xml");

  if (!xmlContent) {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");
  const body = doc.querySelector("body") || doc.documentElement;
  const lines: string[] = [];

  const elements = body.querySelectorAll("p, tbl");
  elements.forEach((el) => {
    if (el.tagName.toLowerCase().endsWith("tbl")) {
      const rows = el.querySelectorAll("tr");
      rows.forEach((row) => {
        const cells: string[] = [];
        row.querySelectorAll("tc").forEach((cell) => {
          cells.push((cell.textContent || "").trim());
        });
        if (cells.length > 0) {
          lines.push(`| ${cells.join(" | ")} |`);
        }
      });
      lines.push("");
    } else {
      const texts: string[] = [];
      el.querySelectorAll("t").forEach((t) => {
        if (t.textContent) {
          texts.push(t.textContent);
        }
      });
      const line = texts.join("").trim();
      if (line) {
        lines.push(line);
      }
    }
  });

  return lines.join("\n\n");
}

async function parsePptxFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const entries = await extractZipEntries(bytes);
  const slideKeys = Array.from(entries.keys())
    .filter((k) => k.startsWith("ppt/slides/slide") && k.endsWith(".xml"))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
      return numA - numB;
    });

  const parser = new DOMParser();
  const slidesContent: string[] = [];

  slideKeys.forEach((key, index) => {
    const xml = entries.get(key);
    if (!xml) return;
    const doc = parser.parseFromString(xml, "text/xml");
    const paragraphs = doc.querySelectorAll("p");
    const slideLines: string[] = [];

    paragraphs.forEach((p) => {
      const texts: string[] = [];
      p.querySelectorAll("t").forEach((t) => {
        if (t.textContent) texts.push(t.textContent);
      });
      const line = texts.join("").trim();
      if (line) slideLines.push(line);
    });

    if (slideLines.length > 0) {
      slidesContent.push(`## Slide ${index + 1}\n` + slideLines.join("\n"));
    }
  });

  return slidesContent.join("\n\n");
}

async function parseXlsxFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const entries = await extractZipEntries(bytes);
  const parser = new DOMParser();

  const sharedStrings: string[] = [];
  const sharedXml = entries.get("xl/sharedStrings.xml");
  if (sharedXml) {
    const doc = parser.parseFromString(sharedXml, "text/xml");
    const items = doc.querySelectorAll("si");
    items.forEach((si) => {
      const texts: string[] = [];
      si.querySelectorAll("t").forEach((t) => {
        if (t.textContent) texts.push(t.textContent);
      });
      sharedStrings.push(texts.join(""));
    });
  }

  const sheetKeys = Array.from(entries.keys())
    .filter((k) => k.startsWith("xl/worksheets/sheet") && k.endsWith(".xml"))
    .sort();

  const sheetsResult: string[] = [];

  sheetKeys.forEach((key, sheetIdx) => {
    const xml = entries.get(key);
    if (!xml) return;
    const doc = parser.parseFromString(xml, "text/xml");
    const rows = doc.querySelectorAll("row");
    const tableRows: string[] = [];

    rows.forEach((row) => {
      const cells: string[] = [];
      row.querySelectorAll("c").forEach((c) => {
        const type = c.getAttribute("t");
        const valElem = c.querySelector("v");
        let val = valElem?.textContent || "";
        if (type === "s" && val) {
          const sIdx = parseInt(val, 10);
          val = sharedStrings[sIdx] || val;
        }
        cells.push(val.trim());
      });
      if (cells.length > 0 && cells.some((cell) => cell.length > 0)) {
        tableRows.push(`| ${cells.join(" | ")} |`);
      }
    });

    if (tableRows.length > 0) {
      sheetsResult.push(`### Sheet ${sheetIdx + 1}\n` + tableRows.join("\n"));
    }
  });

  return sheetsResult.join("\n\n");
}

async function parseOdfFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const entries = await extractZipEntries(bytes);
  const xml = entries.get("content.xml");
  if (!xml) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const paragraphs = doc.querySelectorAll("p, h");
  const lines: string[] = [];

  paragraphs.forEach((p) => {
    const text = (p.textContent || "").trim();
    if (text) lines.push(text);
  });

  return lines.join("\n\n");
}

async function parseEpubFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const entries = await extractZipEntries(bytes);
  const htmlKeys = Array.from(entries.keys())
    .filter((k) => k.endsWith(".html") || k.endsWith(".xhtml") || k.endsWith(".htm"))
    .sort();

  const chapters: string[] = [];
  htmlKeys.forEach((key) => {
    const html = entries.get(key);
    if (!html) return;
    const text = parseHtmlText(html);
    if (text.trim()) chapters.push(text.trim());
  });

  return chapters.join("\n\n---\n\n");
}

async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder("latin1");
  const pdfString = textDecoder.decode(bytes);

  const textFragments: string[] = [];
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(pdfString)) !== null) {
    const streamStart = match.index + match[0].indexOf("\n") + 1;
    const streamLength = match[1].length;
    const streamBytes = bytes.slice(streamStart, streamStart + streamLength);

    let decodedStream = "";
    try {
      const decompressed = await decompressZlib(streamBytes);
      decodedStream = new TextDecoder("latin1").decode(decompressed);
    } catch {
      decodedStream = match[1];
    }

    const textBlocks = extractPdfTextFromStream(decodedStream);
    if (textBlocks) {
      textFragments.push(textBlocks);
    }
  }

  if (textFragments.length === 0) {
    const directMatches = pdfString.match(/\(([^)]+)\)\s*Tj/g);
    if (directMatches) {
      return directMatches.map((m) => m.replace(/^\(|\)\s*Tj$/g, "")).join(" ");
    }
  }

  return textFragments.join("\n\n");
}

function extractPdfTextFromStream(streamContent: string): string {
  const lines: string[] = [];
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let tjMatch: RegExpExecArray | null;
  while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
    const cleaned = tjMatch[1].replace(/\\([()\\])/g, "$1").trim();
    if (cleaned) {
      lines.push(cleaned);
    }
  }

  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  let tjArrMatch: RegExpExecArray | null;
  while ((tjArrMatch = tjArrayRegex.exec(streamContent)) !== null) {
    const inner = tjArrMatch[1];
    const parts = inner.match(/\(([^)]*)\)/g);
    if (parts) {
      const line = parts
        .map((p) => p.slice(1, -1).replace(/\\([()\\])/g, "$1"))
        .join("")
        .trim();
      if (line) {
        lines.push(line);
      }
    }
  }

  return lines.join(" ");
}

function parseHtmlText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
  return (doc.body?.textContent || doc.documentElement.textContent || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

function parseRtfText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\([a-zA-Z]+)(-?[0-9]+)?[ ]?/g, "")
    .replace(/[{}\\]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

function parseJsonText(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

function parseCsvText(csv: string): string {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return "";
  return lines
    .map((line) => {
      const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim());
      return `| ${cells.join(" | ")} |`;
    })
    .join("\n");
}

async function parseGenericOrBinary(buffer: ArrayBuffer): Promise<string> {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  let printableCount = 0;
  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      printableCount++;
    }
  }

  if (text.length > 0 && printableCount / Math.min(text.length, 1000) > 0.7) {
    return text;
  }

  const bytes = new Uint8Array(buffer);
  const extractedChunks: string[] = [];
  let currentChunk: number[] = [];

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b <= 126) || b === 10 || b === 9) {
      currentChunk.push(b);
    } else {
      if (currentChunk.length >= 4) {
        extractedChunks.push(String.fromCharCode(...currentChunk));
      }
      currentChunk = [];
    }
  }

  if (currentChunk.length >= 4) {
    extractedChunks.push(String.fromCharCode(...currentChunk));
  }

  return extractedChunks.join("\n");
}
