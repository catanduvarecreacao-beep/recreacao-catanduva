import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, PageNumber, Packer, Paragraph, TextRun } from "docx";
export const runtime="nodejs";
function safe(value:string){return value.replace(/[\\/:*?"<>|]/g,"-").replace(/\s+/g," ").trim().slice(0,80)||"Aluno";}
export async function POST(request:Request){
 try{
  const b=await request.json();
  const content=typeof b.content==="string"?b.content.trim():"";
  const student=typeof b.studentName==="string"?b.studentName.trim().slice(0,120):"";
  const school=typeof b.schoolName==="string"?b.schoolName.trim().slice(0,180):"";
  const age=typeof b.age==="string"?b.age.slice(0,2):"";
  const grade=typeof b.grade==="string"?b.grade.slice(0,40):"";
  const peiDate=typeof b.peiDate==="string"?b.peiDate:"";
  const review=typeof b.lastReviewDate==="string"?b.lastReviewDate:"";
  if(content.length<80||content.length>50000||!student||!school)return Response.json({error:"Gere novamente o PEI antes de baixar o documento."},{status:400});
  const lines=content.replace(/\r/g,"").split("\n");
  const children=lines.map(line=>{
   const t=line.trim();if(!t)return new Paragraph({text:"",spacing:{after:90}});
   const isHeading=/^(\d+\.|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s/—–()-]{4,})$/.test(t)||t===t.toLocaleUpperCase("pt-BR")&&t.length<110;
   return new Paragraph({children:[new TextRun({text:t,font:"Arial",size:22,bold:isHeading,color:isHeading?"075B89":"293D4A"})],alignment:isHeading?AlignmentType.LEFT:AlignmentType.JUSTIFIED,spacing:{before:isHeading?220:0,after:150,line:330},keepNext:isHeading});
  });
  const doc=new Document({
   creator:"Recreação Catanduva — Educa I.A.",title:"Plano Educacional Individualizado — "+student,subject:"Minuta de PEI para análise e validação pedagógica",
   styles:{default:{document:{run:{font:"Arial",size:22,color:"293D4A"},paragraph:{spacing:{line:330}}}}},
   sections:[{properties:{page:{margin:{top:900,right:1000,bottom:900,left:1000}}},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Recreação Catanduva · Educa I.A.  |  Página ",size:17,color:"718096"}),new TextRun({children:[PageNumber.CURRENT],size:17,color:"718096"})]})]})},
    children:[
     new Paragraph({text:school,heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,spacing:{after:150}}),
     new Paragraph({text:"PLANO EDUCACIONAL INDIVIDUALIZADO (PEI)",heading:HeadingLevel.HEADING_2,alignment:AlignmentType.CENTER,spacing:{after:220}}),
     new Paragraph({children:[new TextRun({text:"MINUTA PARA ANÁLISE E VALIDAÇÃO DA EQUIPE ESCOLAR E DA FAMÍLIA",bold:true,color:"B65D32",size:19})],alignment:AlignmentType.CENTER,spacing:{after:260}}),
     new Paragraph({children:[new TextRun({text:"Criança: ",bold:true,color:"075B89"}),new TextRun(student)]}),
     new Paragraph({children:[new TextRun({text:"Turma: ",bold:true,color:"075B89"}),new TextRun(grade+"  |  Idade: "+age+" anos")]}),
     new Paragraph({children:[new TextRun({text:"Elaboração: ",bold:true,color:"075B89"}),new TextRun(peiDate.split("-").reverse().join("/")+"  |  Última revisão: "+review.split("-").reverse().join("/"))],spacing:{after:180}}),
     new Paragraph({border:{bottom:{color:"E87532",style:BorderStyle.SINGLE,size:10,space:8}},spacing:{after:220}}),
     ...children,
     new Paragraph({text:"",spacing:{before:300}}),
     new Paragraph({text:"VALIDAÇÃO E CIÊNCIA",heading:HeadingLevel.HEADING_2,alignment:AlignmentType.CENTER,spacing:{after:260}}),
     ...["Professor(a) responsável","Coordenação pedagógica","Responsável familiar"].map(label=>new Paragraph({children:[new TextRun({text:"________________________________________",color:"718096"})],alignment:AlignmentType.CENTER,spacing:{before:180,after:70}})),
     ...["Professor(a) responsável","Coordenação pedagógica","Responsável familiar"].map(label=>new Paragraph({text:label,alignment:AlignmentType.CENTER,spacing:{after:140}}))
    ]}]});
  const buffer=await Packer.toBuffer(doc);
  return new Response(new Uint8Array(buffer),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","Content-Disposition:`attachment; filename="pei.docx"; filename*=UTF-8''${encodeURIComponent("PEI_"+safe(student))}.docx`,"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Ocorreu um erro ao montar o arquivo Word. Tente novamente."},{status:500});}
}
