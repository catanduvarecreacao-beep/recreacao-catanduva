import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, PageNumber, Packer, Paragraph, TextRun } from "docx";

export const runtime = "nodejs";

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 100) || "Plano de Aula";
}

function contentParagraphs(content: string) {
  const lines = content.replace(/\r/g, "").split("\n");
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      paragraphs.push(new Paragraph({ text: "", spacing: { after: 100 } }));
      continue;
    }

    const isBullet = /^[-•*]\s+/.test(line);
    const isNumbered = /^\d+[.)]\s+/.test(line);
    const cleanLine = line.replace(/^[-•*]\s+/, "").replace(/^\d+[.)]\s+/, "");
    const isHeading = !isBullet && !isNumbered && line.length <= 90 &&
      (/^(objetivos?|campos? de experiência|direitos? de aprendizagem|competências?( gerais)?|habilidades|abordagem inicial|questões orientadoras|materiais necessários|vivência|desenvolvimento|brincadeiras?|adaptações? inclusivas?|inclusão|fechamento|avaliação|observação|organização|considerações finais)/i.test(line) ||
       (line === line.toLocaleUpperCase("pt-BR") && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(line)));

    if (isHeading) {
      paragraphs.push(new Paragraph({
        text: line.replace(/:$/, ""),
        heading: HeadingLevel.HEADING_2,
        keepNext: true,
        spacing: { before: 260, after: 100 },
        border: { bottom: { color: "D8E6EE", style: BorderStyle.SINGLE, size: 4, space: 5 } }
      }));
    } else if (isBullet || isNumbered) {
      paragraphs.push(new Paragraph({
        children: [new TextRun(cleanLine)],
        bullet: isBullet ? { level: 0 } : undefined,
        numbering: isNumbered ? { reference: "plan-numbering", level: 0 } : undefined,
        indent: { left: 720, hanging: 260 },
        spacing: { after: 90, line: 300 }
      }));
    } else {
      paragraphs.push(new Paragraph({
        children: [new TextRun(line)],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 110, line: 320 }
      }));
    }
  }
  return paragraphs;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const theme = typeof body.theme === "string" ? body.theme.trim() : "";
    const ageRange = typeof body.ageRange === "string" ? body.ageRange.trim() : "";

    if (content.length < 30 || content.length > 50000 || !theme || !ageRange) {
      return Response.json({ error: "Não foi possível preparar o Word. Gere novamente o plano e tente baixar." }, { status: 400 });
    }

    const filename = safeFilename(typeof body.filename === "string" ? body.filename : `Plano de Aula - ${theme}`);
    const doc = new Document({
      creator: "Recreação Catanduva — Educa I.A.",
      title: filename,
      subject: `Planejamento pedagógico: ${theme}`,
      description: "Plano de aula editável para Educação Infantil, alinhado à BNCC.",
      numbering: {
        config: [{
          reference: "plan-numbering",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720, hanging: 260 } } } }]
        }]
      },
      styles: {
        default: {
          document: { run: { font: "Arial", size: 22, color: "263746" }, paragraph: { spacing: { line: 320 } } }
        },
        paragraphStyles: [
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { font: "Arial", bold: true, size: 34, color: "075B89" },
            paragraph: { spacing: { before: 240, after: 160 }, alignment: AlignmentType.CENTER } },
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { font: "Arial", bold: true, size: 25, color: "075B89" },
            paragraph: { spacing: { before: 260, after: 100 } } }
        ]
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 850, right: 900, bottom: 850, left: 900 }
          }
        },
        footers: {
          default: new Footer({ children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Recreação Catanduva · Educa I.A.  |  Página ", color: "718096", size: 18 }),
              new TextRun({ children: [PageNumber.CURRENT], color: "718096", size: 18 })
            ]
          })] })
        },
        children: [
          new Paragraph({ text: "PLANEJAMENTO PEDAGÓGICO", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "EDUCAÇÃO INFANTIL · BNCC", alignment: AlignmentType.CENTER,
            spacing: { after: 260 }, children: [new TextRun({ bold: true, color: "E87532", size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: "Tema: ", bold: true, color: "075B89" }), new TextRun(theme)], spacing: { after: 90 } }),
          new Paragraph({ children: [new TextRun({ text: "Faixa etária: ", bold: true, color: "075B89" }), new TextRun(ageRange)], spacing: { after: 90 } }),
          new Paragraph({ children: [new TextRun({ text: "Data de elaboração: ", bold: true, color: "075B89" }), new TextRun(new Date().toLocaleDateString("pt-BR"))], spacing: { after: 220 } }),
          new Paragraph({ border: { bottom: { color: "E87532", style: BorderStyle.SINGLE, size: 12, space: 8 } }, spacing: { after: 220 } }),
          ...contentParagraphs(content)
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="plano-de-aula.docx"; filename*=UTF-8''${encodeURIComponent(filename)}.docx`,
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return Response.json({ error: "Ocorreu um erro ao montar o arquivo Word. Tente novamente." }, { status: 500 });
  }
}
