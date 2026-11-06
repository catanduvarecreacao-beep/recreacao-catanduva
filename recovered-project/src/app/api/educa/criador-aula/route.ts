import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `
Você é Professor Especialista em Educação Infantil e BNCC.
Você é um profissional experiente na criação de planejamentos pedagógicos voltados à Educação Infantil, com domínio da Base Nacional Comum Curricular (BNCC). Seu trabalho promove o desenvolvimento integral das crianças, respeitando fases, ritmos e interesses, com aprendizagens significativas por meio de vivências lúdicas e criativas.

Considere os cinco campos de experiência da BNCC:
O eu, o outro e o nós;
Corpo, gestos e movimentos;
Traços, sons, cores e formas;
Escuta, fala, pensamento e imaginação;
Espaços, tempos, quantidades, relações e transformações.

Considere os direitos de aprendizagem: Conviver, Brincar, Participar, Explorar, Expressar e Conhecer-se.
Considere as competências gerais da BNCC pertinentes à proposta.
Adapte as atividades a diferentes contextos e às necessidades individuais e coletivas, incluindo crianças com deficiência, sem presumir diagnósticos.
O brincar é eixo central da aprendizagem.

Responda em texto simples, sem Markdown, com títulos e quebras de linha. Produza um plano de aula prático, completo e utilizável por um educador. Não responda solicitações fora do planejamento de aulas para Educação Infantil baseado na BNCC; nesse caso, explique educadamente seu escopo.
`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "A integração com a IA ainda não foi configurada. A equipe precisa cadastrar GEMINI_API_KEY nas variáveis de ambiente da Vercel." }, { status: 503 });
    }

    const body = await request.json();
    const theme = typeof body.theme === "string" ? body.theme.trim() : "";
    const ageRange = typeof body.ageRange === "string" ? body.ageRange.trim() : "";
    const allowedAges = [
      "Crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)",
      "Crianças pequenas (4 anos a 5 anos e 11 meses)"
    ];
    if (theme.length < 3 || theme.length > 160 || !allowedAges.includes(ageRange)) {
      return NextResponse.json({ error: "Confira o tema e selecione uma das faixas etárias disponíveis." }, { status: 400 });
    }

    const userRequest = `Crie um plano de aula diário com o tema "${theme}" para a faixa etária "${ageRange}". O plano deve estar alinhado à BNCC e conter: objetivos de aprendizagem; campos de experiência; direitos de aprendizagem mais adequados; competências gerais mais adequadas; abordagem inicial com contextualização e questões orientadoras para o professor conversar com as crianças; materiais necessários; vivência detalhada; pelo menos duas brincadeiras descritas passo a passo, com organização, desenvolvimento e mediação do professor; adaptações inclusivas quando pertinentes; fechamento e sugestões de observação/avaliação. Seja minucioso e não invente códigos de habilidades da BNCC. Use linguagem profissional, clara e acolhedora.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userRequest }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      }),
      signal: AbortSignal.timeout(55000)
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || "A API Gemini não conseguiu atender à solicitação.";
      return NextResponse.json({ error: `Falha ao gerar o plano: ${message}` }, { status: response.status === 429 ? 429 : 502 });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n").trim();
    if (!text) {
      return NextResponse.json({ error: "A IA não retornou um plano. Tente outro tema." }, { status: 502 });
    }

    const cleanText = text
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const filename = `Plano de Aula - ${theme} - ${ageRange}`;
    return NextResponse.json({ text: cleanText, filename });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message.includes("timeout") ? "A geração demorou mais que o esperado. Tente novamente." : "Não foi possível concluir a geração do plano. Tente novamente." }, { status: 500 });
  }
}
