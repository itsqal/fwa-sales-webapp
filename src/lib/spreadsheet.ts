/**
 * Reading the operator's spreadsheet.
 *
 * The bulk flows drop a file, parse it here, and post what was parsed to a
 * `:validate` endpoint — the operator sees 400 numbers before committing 400.
 * Nothing in this file writes anything or decides anything: the server is what
 * accepts or rejects a batch.
 *
 * `.xls` (the pre-2007 binary format the mockups name) is not read. The only
 * npm package that parses it has two unfixed high-severity advisories, and
 * shipping that into a dashboard three external companies use is a worse trade
 * than asking for a `.xlsx` or `.csv` export.
 */
import { normaliseImei, normaliseMsisdn } from "./msisdn";

export interface ParsedRow {
  msisdn?: string;
  imei?: string;
}

export const ACCEPTED_FILE_TYPES = ".xlsx,.csv";
export const ACCEPTED_FILE_LABEL = "XLSX, CSV";

export class SpreadsheetError extends Error {}

/**
 * Pulls MSISDN and IMEI columns out of a workbook.
 *
 * A header row is used when one is present. Without headers the columns are
 * identified by shape — an IMEI is 14–16 digits with no country code, an MSISDN
 * starts `62` or `08` — because operators paste bare columns as often as they
 * export labelled ones.
 */
export async function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  const rows = await readGrid(file);
  if (rows.length === 0) return [];

  const header = detectHeader(rows[0]);
  const body = header ? rows.slice(1) : rows;

  return body
    .map((cells) => toRow(cells, header))
    .filter((row): row is ParsedRow => row !== null);
}

type Header = { msisdn?: number; imei?: number };

async function readGrid(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith(".csv")) {
    return parseCsv(new TextDecoder().decode(buffer));
  }

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new SpreadsheetError(
      "Berkas tidak dapat dibaca. Gunakan format XLSX atau CSV.",
    );
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new SpreadsheetError("Berkas tidak memiliki lembar data.");

  const grid: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cellText(cell.value));
    });
    if (cells.some((cell) => cell !== "")) grid.push(cells);
  });
  return grid;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const rich = value as { text?: string; result?: unknown };
    if (typeof rich.text === "string") return rich.text.trim();
    if (rich.result !== undefined) return String(rich.result).trim();
    return "";
  }
  return String(value).trim();
}

/** Minimal CSV: these files are single-column number exports, not prose. */
function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((cells) => cells.some((cell) => cell !== ""));
}

function detectHeader(cells: string[]): Header | null {
  const header: Header = {};
  let matched = false;

  cells.forEach((cell, index) => {
    const name = cell.toLowerCase();
    if (name.includes("msisdn") || name.includes("nomor")) {
      header.msisdn = index;
      matched = true;
    } else if (name.includes("imei")) {
      header.imei = index;
      matched = true;
    }
  });

  return matched ? header : null;
}

function toRow(cells: string[], header: Header | null): ParsedRow | null {
  if (header) {
    const row: ParsedRow = {};
    if (header.msisdn !== undefined) {
      const raw = cells[header.msisdn] ?? "";
      if (raw) row.msisdn = normaliseMsisdn(raw);
    }
    if (header.imei !== undefined) {
      const raw = cells[header.imei] ?? "";
      if (raw) row.imei = normaliseImei(raw);
    }
    return row.msisdn || row.imei ? row : null;
  }

  const row: ParsedRow = {};
  for (const cell of cells) {
    const digits = cell.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    if (!digits) continue;
    // A phone number in either accepted form, or an IMEI. The two overlap only
    // for a 14–15 digit value beginning `62`, where a number is far likelier
    // than an IMEI whose TAC happens to start the same way.
    if (/^(62|0)[0-9]{8,13}$/.test(digits) && !row.msisdn) {
      row.msisdn = normaliseMsisdn(digits);
    } else if (/^[0-9]{14,16}$/.test(digits) && !row.imei) {
      row.imei = normaliseImei(digits);
    }
  }
  return row.msisdn || row.imei ? row : null;
}
