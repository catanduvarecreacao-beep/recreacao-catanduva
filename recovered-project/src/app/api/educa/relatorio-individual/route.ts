import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `
Atue como uma pedagoga experiente em Educação Infantil, com domínio da Base Nacional Comum Curricular (BNCC), da documentação pedagógica e da avaliação formativa.
Elabore relatórios individuais descritivos com linguagem formal, acolhedora, ética e respeitosa. Considere a criança como sujeito de direitos e valorize seus processos, conquistas, interesses, interações e possibilidades de desenvolvimento.
Não faça comparações com outras crianças, não rotule comportamentos, não formule diagnósticos e não invente informações que não estejam nos registros fornecidos.
Não transforme ausência de informação em dificuldade ou atraso. Quando os dados forem insuficientes para uma afirmação, não invente.
O relatório deve ser um texto corrido, organizado em parágrafos conectados, sem tópicos ou listas, pronto para revisão e impressão.
`;

const allowedPeriods = ["1º Semestre", "2º Semestre", "Anual"];
const limits: Record<string, number> = {
  studentName: 120, schoolName: 180, teacherClass: 160,
  social: 5000, cognitive: 5000, language: 5000, motor: 5000, obs: 5000
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "A integração com a IA ainda não foi configurada. Cadastre GEMINI_API_KEY nas variáveis de ambiente da Vercel." }, { status: 503 });
    }

    const body = await request.json();
    const values: Record<string, string> = {};
    for (const [key, max] of Object.entries(limits)) {
      const value = typeof body[key] === "string" ? body[key].trim() : "";
      if (value.length > max) return NextResponse.json({ error: "Um dos campos ultrapassou o limite permitido. Revise as informações e tente novamente." }, { status: 400 });
      values[key] = value;
    }
    const reportPeriod = typeof body.reportPeriod === "string" ? body.reportPeriod : "";
    const reportDate = typeof body.reportDate === "string" ? body.reportDate : "";
    if (!allowedPeriods.includes(reportPeriod) || (reportDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(reportDate))) {
      return NextResponse.json({ error: "Confira a data e o período selecionado." }, { status: 400 });
    }
    if (![values.social, values.cognitive, values.language, values.motor].some(Boolean)) {
      return NextResponse.json({ error: "Preencha pelo menos um campo pedagógico para gerar o relatório." }, { status: 400 });
    }

    const prompt = `
Elabore um relatório individual descritivo para Educação Infantil, utilizando exclusivamente as observações abaixo como base. Transforme os registros em texto corrido, formal, acolhedor, coeso e individualizado.

Identificação:
Aluno(a): ${values.studentName || "Não informado"}
Escola: ${values.schoolName || "Não informada"}
Professor(a) / Turma: ${values.teacherClass || "Não informado"}
Período: ${reportPeriod}
Data do relatório: ${reportDate || "Não informada"}

Observações registradas pela equipe pedagógica:
Desenvolvimento social e emocional: ${values.social || "Sem registro informado."}
Desenvolvimento cognitivo (aprendizado): ${values.cognitive || "Sem registro informado."}
Desenvolvimento da linguagem: ${values.language || "Sem registro informado."}
Desenvolvimento motor: ${values.motor || "Sem registro informado."}
Observações gerais / pontos de atenção: ${values.obs || "Sem registro informado."}

Orientações obrigatórias:
- Não use tópicos, marcadores ou enumerações. Escreva parágrafos conectados.
- Produza um texto pronto para revisão, impressão e entrega à família.
- Utilize linguagem alinhada aos princípios da BNCC e à concepção de desenvolvimento integral, sem inventar códigos ou citar habilidades específicas sem necessidade.
- Destaque avanços, interesses, participação, interações e aprendizagens observadas.
- Apresente aspectos em desenvolvimento de maneira construtiva, contextualizada e sem rótulos.
- Não invente fatos, características, diagnósticos, relações familiares ou resultados que não estejam nos dados.
- Não afirme que a criança realiza algo se isso não foi informado.
- Evite generalidades e repetições. Mantenha tom profissional, humano e respeitoso.
- Entregue somente o relatório, sem comentários sobre a tarefa.
`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 5000 }
      }),
      signal: AbortSignal.timeout(55000)
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || "A API Gemini não conseguiu atender à solicitação.";
      return NextResponse.json({ error: `Falha ao gerar o relatório: ${message}` }, { status: response.status === 429 ? 429 : 502 });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\\n").trim();
    if (!text) return NextResponse.json({ error: "A IA não retornou um relatório. Revise os dados e tente novamente." }, { status: 502 });

    const cleanText = text
      .replace(/^#{1,6}\\s+/gm, "")
      .replace(/\\*\\*(.*?)\\*\\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/\\n{3,}/g, "\\n\\n")
      .trim();

    return NextResponse.json({ text: cleanText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message.toLowerCase().includes("timeout") ? "A geração demorou mais que o esperado. Tente novamente." : "Não foi possível concluir a geração do relatório. Tente novamente." }, { status: 500 });
  }
}
