"use client";

import { useState } from "react";

type Props = { onBack: () => void };

export default function CriadorAula({ onBack }: Props) {
  const [theme, setTheme] = useState("");
  const [ageRange, setAgeRange] = useState("Crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)");
  const [preview, setPreview] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPreview("");
    if (theme.trim().length < 3) {
      setError("Informe um tema com pelo menos 3 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/educa/criador-aula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme.trim(), ageRange }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível gerar o planejamento.");
      setPreview(result.text);
      setFilename(result.filename || "Plano de Aula");
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
      const response = await fetch("/api/educa/criador-aula/documento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: preview, theme, ageRange, filename }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Não foi possível preparar o arquivo Word.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${filename.replace(/[\\\\/:*?"<>|]/g, "-")}.docx`;
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
    <section className="creatorPage">
      <div className="creatorShell">
        <button className="back creatorBack" onClick={onBack}>← Voltar ao Educa I.A.</button>
        <header className="creatorHeading">
          <small>EDUCA I.A. · PLANEJAMENTO PEDAGÓGICO</small>
          <h1>Criador de <em>Aula</em></h1>
          <p>Crie planejamentos completos para a Educação Infantil, com intencionalidade pedagógica, brincadeiras e alinhamento à BNCC.</p>
        </header>

        {!preview ? (
          <form className="creatorForm" onSubmit={generatePlan}>
            <label>
              Qual será o tema da aula?
              <input value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="Ex.: As cores da natureza, animais, alimentação saudável..." maxLength={160} required />
            </label>
            <label>
              Faixa etária
              <select value={ageRange} onChange={(event) => setAgeRange(event.target.value)}>
                <option value="Crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)">Crianças bem pequenas — 1 ano e 7 meses a 3 anos e 11 meses</option>
                <option value="Crianças pequenas (4 anos a 5 anos e 11 meses)">Crianças pequenas — 4 anos a 5 anos e 11 meses</option>
              </select>
            </label>
            <button className="creatorSubmit" disabled={loading}>{loading ? "Preparando seu planejamento..." : "✦ Gerar plano de aula"}</button>
            {loading && <div className="creatorLoading"><span className="creatorSpinner" /> A IA está elaborando uma proposta pedagógica completa.</div>}
            {error && <div className="creatorError" role="alert">{error}</div>}
          </form>
        ) : (
          <div className="creatorPreview">
            <div className="creatorPreviewHeader">
              <div><h2>Seu planejamento está pronto!</h2><p>Revise o conteúdo e, quando desejar, exporte para Word.</p></div>
            </div>
            <div className="creatorPreviewText">{preview}</div>
            <div className="creatorPreviewActions">
              <button className="creatorDownload" onClick={downloadWord} disabled={loading}>{loading ? "Preparando arquivo..." : "↓ Baixar Word editável (.docx)"}</button>
              <button onClick={() => { setPreview(""); setError(""); }}>＋ Criar novo planejamento</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
