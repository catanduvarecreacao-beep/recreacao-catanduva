import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, PageNumber, Packer, Paragraph, TextRun } from "docx";

export const runtime = "nodejs";

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 90) || "Relatorio Individual";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const studentName = typeof body.studentName === "string" ? body.studentName.trim().slice(0, 120) : "";
    const schoolName = typeof body.schoolName === "string" ? body.schoolName.trim().slice(0, 180) : "";
    const teacherClass = typeof body.teacherClass === "string" ? body.teacherClass.trim().slice(0, 160) : "";
    const reportPeriod = typeof body.reportPeriod === "string" ? body.reportPeriod : "";
    const reportDate = typeof body.reportDate === "string" ? body.reportDate : "";

    if (content.length < 30 || content.length > 30000 || !["1º Semestre", "2º Semestre", "Anual"].includes(reportPeriod)) {
      return Response.json({ error: "Gere novamente o relatório antes de baixar o documento." }, { status: 400 });
    }

    const filename = safeFilename(`Relatório Individual - ${studentName || "Aluno"}`);
    const paragraphs = content.replace(/\r/g, "").split("\n").filter((line: string) => line.trim()).map((line: string) =>
      new Paragraph({
        children: [new TextRun({ text: line.trim().replace(/\*\*/g, ""), font: "Arial", size: 23, color: "293D4A" })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 180, line: 340 }
      })
    );

    const doc = new Document({
      creator: "Recreação Catanduva — Educa I.A.",
      title: filename,
      subject: "Relatório individual descritivo da Educação Infantil",
      styles: {
        default: { document: { run: { font: "Arial", size: 23, color: "293D4A" }, paragraph: { spacing: { line: 340 } } } },
        paragraphStyles: [
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { font: "Arial", bold: true, size: 32, color: "075B89" },
            paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 180 } } },
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { font: "Arial", bold: true, size: 25, color: "075B89" },
            paragraph: { spacing: { before: 200, after: 120 } } }
        ]
      },
      sections: [{
        properties: { page: { margin: { top: 900, right: 1050, bottom: 900, left: 1050 } } },
        footers: { default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Recreação Catanduva · Educa I.A.  |  Página ", color: "718096", size: 18 }),
            new TextRun({ children: [PageNumber.CURRENT], color: "718096", size: 18 })
          ]
        })] }) },
        children: [
          new Paragraph({ text: schoolName || "RECREAÇÃO CATANDUVA", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "RELATÓRIO INDIVIDUAL DESCRITIVO", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { after: 260 } }),
          ...(studentName ? [new Paragraph({ children: [new TextRun({ text: "Aluno(a): ", bold: true, color: "075B89" }), new TextRun(studentName)], spacing: { after: 100 } })] : []),
          ...(teacherClass ? [new Paragraph({ children: [new TextRun({ text: "Professor(a) / Turma: ", bold: true, color: "075B89" }), new TextRun(teacherClass)], spacing: { after: 100 } })] : []),
          new Paragraph({ children: [new TextRun({ text: "Período: ", bold: true, color: "075B89" }), new TextRun(reportPeriod)], spacing: { after: 100 } }),
          ...(reportDate ? [new Paragraph({ children: [new TextRun({ text: "Data: ", bold: true, color: "075B89" }), new TextRun(reportDate.split("-").reverse().join("/"))], spacing: { after: 220 } })] : []),
          new Paragraph({ border: { bottom: { color: "E87532", style: BorderStyle.SINGLE, size: 10, space: 8 } }, spacing: { after: 240 } }),
          ...paragraphs,
          new Paragraph({ text: "", spacing: { before: 500, after: 100 } }),
          new Paragraph({ text: "____________________________________________________________", alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
          new Paragraph({ text: "Assinatura do(a) professor(a)", alignment: AlignmentType.CENTER, spacing: { after: 180 } })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="relatorio-individual.docx"; filename*=UTF-8''${encodeURIComponent(filename)}.docx`,
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return Response.json({ error: "Ocorreu um erro ao montar o arquivo Word. Tente novamente." }, { status: 500 });
  }
}
