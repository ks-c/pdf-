
import { Paper } from '../types';

declare const pdfjsLib: any;
declare const XLSX: any;

export async function parsePdfToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
}

export async function parseXlsx(file: File): Promise<Partial<Paper>[]> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(worksheet);

  return json.map((row: any) => ({
    title: row['标题'] || row['Title'] || '',
    authors: (row['作者'] || row['Authors'] || '').split(/,|;/).map((s:string) => s.trim()).filter(Boolean),
    abstract: row['摘要'] || row['Abstract'] || '',
    doi: row['DOI'] || row['doi'] || '',
    journal: row['期刊名'] || row['Journal'] || '',
    date: row['时间'] || row['Date'] || '',
  }));
}
