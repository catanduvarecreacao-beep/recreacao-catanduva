"use client";

import { useState } from "react";

type Props = { onBack: () => void };
type PEIForm = {
  studentName: string; birthDate: string; schoolName: string; guardians: string;
  peiDate: string; lastReviewDate: string; age: string; grade: string; need: string;
  challenges: string; strengths: string; family: string;
};
const today = () => new Date().toISOString().slice(0,10);
const initialForm = (): PEIForm => ({
  studentName:"", birthDate:"", schoolName:"", guardians:"", peiDate:today(),
  lastReviewDate:today(), age:"", grade:"", need:"", challenges:"", strengths:"", family:""
});
const needOptions = [
  "Sem laudo / necessidade em investigação pedagógica",
  "Transtorno do Espectro Autista (TEA) — informação fornecida pela família/equipe",
  "Transtorno do Déficit de Atenção e Hiperatividade (TDAH) — informação fornecida pela família/equipe",
  "Deficiência Intelectual — informação fornecida pela família/equipe",
  "Atraso Global do Desenvolvimento — informação fornecida pela família/equipe",
  "Síndrome de Down — informação fornecida pela família/equipe",
  "Deficiência Auditiva — informação fornecida pela família/equipe",
  "Deficiência Visual — informação fornecida pela família/equipe",
  "Deficiência Física/Motora — informação fornecida pela família/equipe",
  "Transtorno Opositor Desafiador (TOD) — informação fornecida pela família/equipe",
  "Dislexia — informação fornecida pela família/equipe",
  "Discalculia — informação fornecida pela família/equipe",
  "Outra condição ou necessidade de apoio"
];
function dateLabel(value:string){if(!value)return "";const [y,m,d]=value.split("-");return d&&m&&y?d+"/"+m+"/"+y:value;}
export default function PEI({onBack}:Props){
  const [form,setForm]=useState<PEIForm>(initialForm);
  const [preview,setPreview]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  function update<K extends keyof PEIForm>(key:K,value:PEIForm[K]){setForm(v=>({...v,[key]:value}));}
  async function generate(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setNotice("");setPreview("");
    if(!form.studentName.trim()||!form.birthDate||!form.schoolName.trim()||!form.guardians.trim()||!form.peiDate||!form.lastReviewDate||!form.age||!form.grade||!form.need){
      setError("Preencha todos os campos obrigatórios de identificação para continuar.");return;
    }
    if(Number(form.age)<0||Number(form.age)>12||!Number.isInteger(Number(form.age))){setError("Informe uma idade válida, entre 0 e 12 anos.");return;}
    setLoading(true);
    try{
      const response=await fetch("/api/educa/pei",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível gerar o PEI.");
      setPreview(result.text);setNotice("PEI elaborado como minuta. Revise e valide cada estratégia com a equipe responsável e a família.");
    }catch(err){setError(err instanceof Error?err.message:"Ocorreu um erro inesperado.");}
    finally{setLoading(false);}
  }
  async function download(){
    if(!preview||loading)return;setError("");setLoading(true);
    try{
      const response=await fetch("/api/educa/pei/documento",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:preview,...form})});
      if(!response.ok){const result=await response.json().catch(()=>({}));throw new Error(result.error||"Não foi possível preparar o Word.");}
      const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");
      a.href=url;a.download="PEI_"+(form.studentName||"Aluno").replace(/[\\/:*?"<>|]/g,"-").replace(/\s+/g,"_")+".docx";
      document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    }catch(err){setError(err instanceof Error?err.message:"Erro ao baixar o documento.");}
    finally{setLoading(false);}
  }
  return <section className="creatorPage peiPage"><div className="creatorShell">
    <button className="back creatorBack" onClick={onBack}>← Voltar ao Educa I.A.</button>
    <header className="creatorHeading"><small>EDUCA I.A. · EDUCAÇÃO INCLUSIVA</small><h1>Plano <em>Educacional Individualizado</em></h1><p>Organize informações, potencialidades e necessidades de apoio para construir um planejamento individualizado, com foco no desenvolvimento integral e na psicomotricidade.</p></header>
    {!preview?<form className="creatorForm peiForm" onSubmit={generate}>
      <div className="reportSectionTitle"><span>01</span><div><strong>Identificação da criança</strong><small>Informações básicas para identificação e acompanhamento do plano</small></div></div>
      <div className="reportFieldsGrid">
        <label>Nome do aluno(a) *<input value={form.studentName} onChange={e=>update("studentName",e.target.value)} maxLength={120} placeholder="Nome completo"/></label>
        <label>Data de nascimento *<input type="date" value={form.birthDate} onChange={e=>update("birthDate",e.target.value)}/></label>
        <label>Nome da escola *<input value={form.schoolName} onChange={e=>update("schoolName",e.target.value)} maxLength={180} placeholder="Unidade escolar"/></label>
        <label>Responsáveis *<textarea rows={2} value={form.guardians} onChange={e=>update("guardians",e.target.value)} maxLength={1000} placeholder="Nome e vínculo dos responsáveis"/></label>
        <label>Data de elaboração do PEI *<input type="date" value={form.peiDate} onChange={e=>update("peiDate",e.target.value)}/></label>
        <label>Data da última revisão *<input type="date" value={form.lastReviewDate} onChange={e=>update("lastReviewDate",e.target.value)}/></label>
        <label>Idade da criança (anos) *<input type="number" min="0" max="12" step="1" value={form.age} onChange={e=>update("age",e.target.value)} placeholder="Ex.: 5"/></label>
        <label>Turma / ano *<select value={form.grade} onChange={e=>update("grade",e.target.value)}><option value="">Selecione a turma</option><option value="Jardim">Jardim</option><option value="Pré I">Pré I</option><option value="Pré II">Pré II</option><option value="Outra">Outra</option></select></label>
        <label className="peiWide">Necessidade educacional / informação de referência *<select value={form.need} onChange={e=>update("need",e.target.value)}><option value="">Selecione uma opção</option>{needOptions.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      </div>
      <div className="reportSectionTitle reportPedagogyTitle"><span>02</span><div><strong>Perfil de aprendizagem e apoios</strong><small>Descreva situações observáveis, sem presumir diagnósticos ou limitações</small></div></div>
      <label className="reportTextField">Principais desafios observados<textarea rows={4} maxLength={6000} value={form.challenges} onChange={e=>update("challenges",e.target.value)} placeholder="Ex.: situações em que precisa de apoio na comunicação, interação, atenção, autonomia, transições ou coordenação motora."/></label>
      <label className="reportTextField">Potencialidades, interesses e preferências<textarea rows={4} maxLength={6000} value={form.strengths} onChange={e=>update("strengths",e.target.value)} placeholder="Ex.: brincadeiras preferidas, temas de interesse, habilidades, formas de comunicação e atividades que favorecem o engajamento."/></label>
      <label className="reportTextField">Contexto familiar e rede de apoio<textarea rows={4} maxLength={4000} value={form.family} onChange={e=>update("family",e.target.value)} placeholder="Inclua somente informações relevantes ao planejamento escolar e compartilhadas com autorização."/></label>
      <div className="reportPrivacyNote peiPrivacy"><span>✦</span><p><strong>Uso responsável:</strong> este documento é uma minuta de apoio pedagógico, não substitui avaliação multiprofissional nem define diagnóstico. A IA não deve inventar informações. Revise objetivos, estratégias e adaptações com a equipe escolar e a família. Registre apenas dados necessários e autorizados, mantendo a confidencialidade da criança.</p></div>
      <button className="creatorSubmit" disabled={loading}>{loading?"Elaborando o PEI...":"✦ Gerar PEI completo com IA"}</button>
      {loading&&<div className="creatorLoading"><span className="creatorSpinner"/> A IA está estruturando objetivos, estratégias e propostas de acompanhamento.</div>}
      {error&&<div className="creatorError" role="alert">{error}</div>}
    </form>:<div className="creatorPreview">
      <div className="creatorPreviewHeader"><div><h2>Seu PEI está pronto!</h2><p>Revise cuidadosamente a minuta antes de utilizá-la.</p></div><span className="reportReadyTag">✓ Minuta gerada</span></div>
      <div className="reportDocumentHeading"><strong>{form.schoolName}</strong><h3>PLANO EDUCACIONAL INDIVIDUALIZADO</h3><p><b>Aluno(a):</b> {form.studentName}</p><p><b>Turma:</b> {form.grade} · <b>Idade:</b> {form.age} anos</p><p><b>Elaboração:</b> {dateLabel(form.peiDate)} · <b>Última revisão:</b> {dateLabel(form.lastReviewDate)}</p></div>
      <div className="creatorPreviewText peiPreviewText">{preview}</div>
      {notice&&<div className="reportSuccess">{notice}</div>}{error&&<div className="creatorError" role="alert">{error}</div>}
      <div className="creatorPreviewActions"><button className="creatorDownload" onClick={download} disabled={loading}>{loading?"Preparando arquivo...":"↓ Baixar Word editável (.docx)"}</button><button onClick={()=>{setPreview("");setError("");setNotice("");}}>← Voltar e editar informações</button><button onClick={()=>{setForm(initialForm());setPreview("");setError("");setNotice("");}}>＋ Criar novo PEI</button></div>
    </div>}
  </div></section>;
}
