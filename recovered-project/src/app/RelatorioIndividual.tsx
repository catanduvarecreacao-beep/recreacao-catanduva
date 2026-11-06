"use client";

import { useState } from "react";

type Props = { onBack: () => void };

type ReportForm = {
  studentName: string;
  schoolName: string;
  teacherClass: string;
  reportDate: string;
  reportPeriod: string;
  social: string;
  cognitive: string;
  language: string;
  motor: string;
  obs: string;
};

const initialForm = (): ReportForm => ({
  studentName: "",
  schoolName: "",
  teacherClass: "",
  reportDate: new Date().toISOString().slice(0, 10),
  reportPeriod: "1º Semestre",
  social: "",
  cognitive: "",
  language: "",
  motor: "",
  obs: "",
});

const fields: { key: "social" | "cognitive" | "language" | "motor" | "obs"; title: string; hint: string }[] = [
  { key: "social", title: "1. Desenvolvimento Social e Emocional", hint: "Como interage com amigos? Resolve conflitos? Ex.: demonstra carinho, compartilha materiais, participa das brincadeiras..." },
  { key: "cognitive", title: "2. Desenvolvimento Cognitivo (Aprendizado)", hint: "Atenção, cores, números, curiosidade e descobertas. Ex.: reconhece o próprio nome, realiza contagens, demonstra interesse..." },
  { key: "language", title: "3. Desenvolvimento da Linguagem", hint: "Fala, vocabulário, comunicação e contação de histórias. Ex.: expressa ideias, amplia o vocabulário, gosta de livros..." },
  { key: "motor", title: "4. Desenvolvimento Motor", hint: "Correr, pular, desenhar, recortar e coordenação. Ex.: movimenta-se com equilíbrio, explora diferentes gestos..." },
  { key: "obs", title: "5. Observações Gerais / Pontos de Atenção", hint: "Adaptação, autonomia, participação, rotina e outros aspectos relevantes. Evite incluir informações íntimas ou diagnósticos não confirmados." },
];

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

export default function RelatorioIndividual({ onBack }: Props) {
  const [form, setForm] = useState<ReportForm>(initialForm);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function update<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generateReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPreview("");

    if (![form.social, form.cognitive, form.language, form.motor].some((value) => value.trim())) {
      setError("Preencha pelo menos um dos quatro campos de desenvolvimento para gerar o relatório.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/educa/relatorio-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível gerar o relatório.");
      setPreview(result.text);
      setNotice("Relatório gerado com sucesso. Revise o texto antes de utilizá-lo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadWord() {
    if (!preview || loading) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/educa/relatorio-individual/documento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: preview, ...form }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Não foi possível preparar o arquivo Word.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Relatorio_${(form.studentName || "Aluno").replace(/[\\\\/:*?"<>|]/g, "-").replace(/\\s+/g, "_")}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao baixar o Word.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="creatorPage reportPage">
      <div className="creatorShell">
        <button className="back creatorBack" onClick={onBack}>← Voltar ao Educa I.A.</button>
        <header className="creatorHeading">
          <small>EDUCA I.A. · DOCUMENTAÇÃO PEDAGÓGICA</small>
          <h1>Relatório <em>Individual</em></h1>
          <p>Transforme suas observações sobre a criança em um registro descritivo, acolhedor e alinhado aos princípios da Educação Infantil e da BNCC.</p>
        </header>

        {!preview ? (
          <form className="creatorForm reportForm" onSubmit={generateReport}>
            <div className="reportSectionTitle"><span>01</span><div><strong>Identificação</strong><small>Dados para compor o cabeçalho do relatório</small></div></div>
            <div className="reportFieldsGrid">
              <label>Nome do aluno(a)<input value={form.studentName} onChange={(event) => update("studentName", event.target.value)} placeholder="Ex.: Maria Silva" maxLength={120} /></label>
              <label>Escola<input value={form.schoolName} onChange={(event) => update("schoolName", event.target.value)} placeholder="Nome da escola" maxLength={180} /></label>
              <label>Professor(a) / Turma<input value={form.teacherClass} onChange={(event) => update("teacherClass", event.target.value)} placeholder="Ex.: Prof. Ana — Jardim II" maxLength={160} /></label>
              <label>Data do relatório<input type="date" value={form.reportDate} onChange={(event) => update("reportDate", event.target.value)} /></label>
              <label>Período<select value={form.reportPeriod} onChange={(event) => update("reportPeriod", event.target.value)}><option>1º Semestre</option><option>2º Semestre</option><option>Anual</option></select></label>
            </div>

            <div className="reportSectionTitle reportPedagogyTitle"><span>02</span><div><strong>Observações pedagógicas</strong><small>Registre situações observadas no cotidiano, considerando o percurso individual da criança</small></div></div>
            {fields.map((field) => (
              <label className="reportTextField" key={field.key}>
                {field.title}
                <textarea value={form[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.hint} rows={4} maxLength={5000} />
              </label>
            ))}
            <div className="reportPrivacyNote"><span>✦</span><p>Utilize observações concretas e respeitosas. O relatório deve valorizar conquistas, processos e possibilidades de desenvolvimento, sem comparações entre crianças ou atribuição de diagnósticos.</p></div>
            <button className="creatorSubmit" disabled={loading}>{loading ? "Elaborando relatório..." : "✦ Gerar relatório com IA"}</button>
            {loading && <div className="creatorLoading"><span className="creatorSpinner" /> A IA está organizando suas observações em um texto pedagógico individualizado.</div>}
            {error && <div className="creatorError" role="alert">{error}</div>}
          </form>
        ) : (
          <div className="creatorPreview">
            <div className="creatorPreviewHeader">
              <div><h2>Seu relatório está pronto!</h2><p>Confira as informações e revise o texto antes de exportar.</p></div>
              <span className="reportReadyTag">✓ Texto gerado</span>
            </div>
            <div className="reportDocumentHeading">
              {form.schoolName && <strong>{form.schoolName}</strong>}
              <h3>RELATÓRIO INDIVIDUAL DESCRITIVO</h3>
              {form.studentName && <p><b>Aluno(a):</b> {form.studentName}</p>}
              {form.teacherClass && <p><b>Professor(a) / Turma:</b> {form.teacherClass}</p>}
              <p><b>Período:</b> {form.reportPeriod}{form.reportDate ? ` · Data: ${formatDate(form.reportDate)}` : ""}</p>
            </div>
            <div className="creatorPreviewText reportPreviewText">{preview}</div>
            {notice && <div className="reportSuccess">{notice}</div>}
            {error && <div className="creatorError" role="alert">{error}</div>}
            <div className="creatorPreviewActions">
              <button className="creatorDownload" onClick={downloadWord} disabled={loading}>{loading ? "Preparando arquivo..." : "↓ Baixar Word editável (.docx)"}</button>
              <button onClick={() => { setPreview(""); setError(""); setNotice(""); }}>← Voltar e editar informações</button>
              <button onClick={() => { setForm(initialForm()); setPreview(""); setError(""); setNotice(""); }}>＋ Novo relatório</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
