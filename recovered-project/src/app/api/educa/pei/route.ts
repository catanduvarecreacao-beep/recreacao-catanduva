import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const limits: Record<string, number> = {
  studentName:120,birthDate:10,schoolName:180,guardians:1000,peiDate:10,lastReviewDate:10,
  age:2,grade:40,need:220,challenges:6000,strengths:6000,family:4000
};
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const SYSTEM_PROMPT = `
Atue como especialista em educação inclusiva e planejamento pedagógico individualizado na Educação Infantil, com conhecimento da BNCC, acessibilidade, desenho universal para aprendizagem, avaliação formativa e psicomotricidade.
Produza uma minuta profissional, prática, individualizada, respeitosa e centrada na criança. Valorize potencialidades, interesses, participação, autonomia, comunicação, interação, brincadeira e barreiras do ambiente que possam ser reduzidas.
Não faça diagnóstico clínico, não determine nível de suporte, não conclua deficiência ou transtorno e não trate a opção selecionada no formulário como comprovação clínica. Não invente fatos, habilidades, preferências, terapias, recomendações clínicas ou resultados. Diferencie claramente dados fornecidos, hipóteses pedagógicas a observar e propostas de apoio.
Não use linguagem capacitista, rótulos, punições, metas de normalização ou exigências incompatíveis com a idade. Não prometa resultados. Evite objetivos vagos: proponha metas observáveis, alcançáveis, flexíveis e revisáveis, sem fixar prazos rígidos quando não houver dados suficientes.
A psicomotricidade deve aparecer em propostas lúdicas e acessíveis de esquema corporal, equilíbrio, coordenação ampla e fina, orientação espacial, ritmo, exploração sensorial voluntária e expressão corporal, respeitando preferências e segurança. Não prescreva terapias nem exercícios clínicos.
`;

export async function POST(request:Request){
 try{
  const key=process.env.GEMINI_API_KEY;
  if(!key)return NextResponse.json({error:"A integração com a IA ainda não foi configurada. Verifique GEMINI_API_KEY na Vercel."},{status:503});
  const body=await request.json();const values:Record<string,string>={};
  for(const [field,max] of Object.entries(limits)){
   const value=typeof body[field]==="string"?body[field].trim():"";
   if(value.length>max)return NextResponse.json({error:"Um dos campos ultrapassou o limite permitido. Revise as informações."},{status:400});
   values[field]=value;
  }
  for(const field of ["birthDate","peiDate","lastReviewDate"]){if(!datePattern.test(values[field])||Number.isNaN(Date.parse(values[field])))return NextResponse.json({error:"Informe datas válidas nos campos obrigatórios."},{status:400});}
  if(!values.studentName||!values.schoolName||!values.guardians||!values.age||!values.grade||!values.need)return NextResponse.json({error:"Preencha todos os campos obrigatórios."},{status:400});
  if(!/^\d+$/.test(values.age)||Number(values.age)>12)return NextResponse.json({error:"Informe uma idade válida entre 0 e 12 anos."},{status:400});
  const prompt=`
Elabore uma MINUTA DE PLANO EDUCACIONAL INDIVIDUALIZADO (PEI) para Educação Infantil com foco no desenvolvimento integral e psicomotricidade. Use somente os dados abaixo. Onde faltarem informações, indique "a levantar com a equipe/família" ou proponha observação pedagógica, sem preencher lacunas com suposições.

IDENTIFICAÇÃO
Criança: ${values.studentName}
Nascimento: ${values.birthDate}
Idade informada: ${values.age} anos
Turma: ${values.grade}
Escola: ${values.schoolName}
Responsáveis: ${values.guardians}
Data de elaboração: ${values.peiDate}
Última revisão: ${values.lastReviewDate}

INFORMAÇÕES DE REFERÊNCIA E PERFIL
Informação de necessidade educacional selecionada no formulário (não presumir diagnóstico confirmado): ${values.need}
Desafios/barreiras observados: ${values.challenges||"Não informado"}
Potencialidades e interesses: ${values.strengths||"Não informado"}
Contexto familiar/rede de apoio: ${values.family||"Não informado"}

ESTRUTURA OBRIGATÓRIA DO DOCUMENTO
1. IDENTIFICAÇÃO E FINALIDADE DO PEI
2. PERFIL PEDAGÓGICO E FUNCIONAL — separar informações fornecidas de pontos que precisam ser observados; não produzir diagnóstico.
3. POTENCIALIDADES, INTERESSES E FORMAS DE PARTICIPAÇÃO
4. BARREIRAS À APRENDIZAGEM E À PARTICIPAÇÃO — somente as descritas ou a investigar.
5. OBJETIVO GERAL
6. OBJETIVOS ESPECÍFICOS E INDICADORES OBSERVÁVEIS — comunicação, interação, autonomia, cognição/brincadeira e desenvolvimento motor, somente quando pertinentes; não criar metas inadequadas.
7. ESTRATÉGIAS E RECURSOS DE ACESSIBILIDADE — comunicação, previsibilidade/rotina, organização do ambiente, mediação e adaptações de materiais.
8. PLANO DE AÇÃO PEDAGÓGICA COM PSICOMOTRICIDADE — atividades lúdicas acessíveis, materiais, mediação do adulto e possibilidades de participação; incluir alternativas.
9. ACOMPANHAMENTO E AVALIAÇÃO CONTÍNUA — como registrar observações e rever estratégias.
10. ARTICULAÇÃO COM A FAMÍLIA E EQUIPE ESCOLAR
11. REVISÃO DO PLANO — campos/questões para revisão periódica.
12. REGISTRO DE VALIDAÇÃO — espaços para professor(a), coordenação, família/responsáveis e data.

Escreva em português brasileiro, texto claro e profissional. Use títulos em LETRAS MAIÚSCULAS, parágrafos e listas quando facilitarem a consulta. Torne as estratégias concretas, inclusivas e viáveis na rotina da Educação Infantil. Não invente dados, códigos BNCC, diagnósticos ou tratamentos. Identifique a saída como MINUTA PARA ANÁLISE E VALIDAÇÃO DA EQUIPE ESCOLAR E DA FAMÍLIA.
`;
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
   body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.35,maxOutputTokens:8000}}),
   signal:AbortSignal.timeout(55000)
  });
  const data=await response.json();
  if(!response.ok)return NextResponse.json({error:"Falha ao gerar o PEI. "+(data?.error?.message||"Tente novamente mais tarde.")},{status:response.status===429?429:502});
  const output=data?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||"").join("\n").trim();
  if(!output)return NextResponse.json({error:"A IA não retornou o documento. Revise os dados e tente novamente."},{status:502});
  return NextResponse.json({text:output.replace(/^#{1,6}\s+/gm,"").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\n{3,}/g,"\n\n").trim()});
 }catch(err){const msg=err instanceof Error?err.message:"";return NextResponse.json({error:msg.toLowerCase().includes("timeout")?"A geração demorou mais que o esperado. Tente novamente.":"Não foi possível gerar o PEI. Tente novamente."},{status:500});}
}
