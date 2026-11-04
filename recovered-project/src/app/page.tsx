"use client";

import { useEffect, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SCHOOLS = [
  "EMEI Albertina Baldo Pereira",
  "EMEI Profª. Albertina Diogo Spanazzi",
  "EMEI Ângelo Carana",
  "EMEI Caio Eduardo Luis Pereira Manchini",
  "EMEI Profª. Cênica Bochi",
  "EMEI Prof. Carlos Alberto Spina",
  "EMEI Profª. Dora de Arruda Mendes",
  "EMEI Gabriel Hernandes Ferreira",
  "EMEI Profª. Idette de Lourdes Frias Couto",
  "EMEI Luiza Lourenço da Cruz",
  "EMEI Profª. Maria Ap. de Carvalho Azarite",
  "EMEI Profª. Maria Áurea Rosa Domingues",
  "EMEI Profª. Maria José Brida Fedelli",
  "EMEI Prof. Mário Antonio Bizari",
  "EMEI Profª. Marisa Ap. Vera Dervelan",
  "EMEI Prof. Nardi",
  "EMEI Prof. Neuze Baptista",
  "EMEI Prof. Virgílio de Arruda Mendes",
];

const SEGMENTS = ["Jardim", "Pré I", "Pré II"];
const CLASSES = ["A", "B", "C", "D", "E", "F"];
const BIMESTERS = [1, 2, 3, 4];
const RATINGS = ["Boa", "Regular", "Revisar"];

type Role = "professor" | "diretor" | "admin";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  role: Role;
  school_name: string;
  segment: string;
  class_name: string;
};

type Lesson = {
  id: string;
  segment: string;
  bimester: number;
  lesson_number: number;
  title: string | null;
  material_url: string | null;
};

type Evaluation = {
  id: string;
  teacher_id: string;
  school_name: string;
  segment: string;
  class_name: string;
  bimester: number;
  lesson_number: number;
  lesson_rating: string;
  class_description: string | null;
  checked_at: string | null;
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<"home" | "login" | "signup" | "app" | "director">("home");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [segment, setSegment] = useState("Jardim");
  const [className, setClassName] = useState("A");

  const [bimester, setBimester] = useState(1);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [ratings, setRatings] = useState<Record<number, string>>({});
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const [directorSegment, setDirectorSegment] = useState("Jardim");
  const [directorBimester, setDirectorBimester] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Mantém a sessão sincronizada com o Supabase Auth.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // Permite fechar a janela do material pelo teclado.
  useEffect(() => {
    if (!selectedLesson) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedLesson(null);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedLesson]);

  // Carrega o perfil associado à conta autenticada.
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!session?.user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,role,school_name,segment,class_name")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (error) {
        setMessage("Não foi possível carregar o perfil. Confirme o cadastro e entre novamente.");
        return;
      }

      setProfile(data as Profile);
      setView("app");
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Busca aulas e avaliações do professor para o bimestre selecionado.
  useEffect(() => {
    let cancelled = false;

    async function loadTeacherData() {
      if (!profile || profile.role !== "professor") return;

      const { data: lessonData } = await supabase
        .from("lessons")
        .select("id,segment,bimester,lesson_number,title,material_url")
        .eq("segment", profile.segment)
        .eq("bimester", bimester)
        .order("lesson_number");

      if (cancelled) return;
      setLessons((lessonData || []) as Lesson[]);

      const { data: evaluationData } = await supabase
        .from("evaluations")
        .select("*")
        .eq("teacher_id", profile.id)
        .eq("segment", profile.segment)
        .eq("class_name", profile.class_name)
        .eq("bimester", bimester)
        .order("lesson_number");

      if (cancelled) return;
      const rows = (evaluationData || []) as Evaluation[];
      setEvaluations(rows);

      const nextRatings: Record<number, string> = {};
      const nextDescriptions: Record<number, string> = {};
      rows.forEach((evaluation) => {
        nextRatings[evaluation.lesson_number] = evaluation.lesson_rating;
        nextDescriptions[evaluation.lesson_number] = evaluation.class_description || "";
      });
      setRatings(nextRatings);
      setDescriptions(nextDescriptions);
    }

    loadTeacherData();
    return () => {
      cancelled = true;
    };
  }, [profile, bimester]);

  async function registerAccount() {
    setMessage("");

    if (!fullName.trim() || !school || !email.trim() || password.length < 6) {
      setMessage("Preencha todos os campos. A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName.trim(),
          school_name: school,
          segment,
          class_name: className,
        },
      },
    });
    setLoading(false);

    setMessage(
      error
        ? error.message
        : "Cadastro solicitado! Confirme seu e-mail, se solicitado, e depois entre no sistema.",
    );

    if (!error) setView("login");
  }

  async function signIn() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (error) {
      setMessage("Não foi possível entrar. Confira e-mail, senha e confirmação do cadastro.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setView("home");
    setMessage("");
  }

  function getMaterialEmbedUrl(rawUrl: string) {
    try {
      const url = new URL(rawUrl);
      const host = url.hostname.replace(/^www\\./, "");
      if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
      if (host.includes("youtube.com")) {
        const videoId = url.searchParams.get("v");
        if (url.pathname.startsWith("/embed/")) return rawUrl;
        if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
      }
      if (host.includes("drive.google.com")) {
        const fileId = url.pathname.match(/\\/file\\/d\\/([^/]+)/)?.[1];
        if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
      }
      if (host === "docs.google.com" && /\\/(document|presentation|spreadsheets)\\/d\\//.test(url.pathname)) {
        return rawUrl.replace(/\\/(edit|view)(\\?.*)?$/, "/preview");
      }
      if (host.includes("vimeo.com") && /^\\/\\d+/.test(url.pathname)) {
        return `https://player.vimeo.com/video/${url.pathname.slice(1)}`;
      }
      return rawUrl;
    } catch {
      return rawUrl;
    }
  }

  async function saveEvaluation(lesson: Lesson) {
    if (!profile || profile.role !== "professor") return;

    const selectedRating = ratings[lesson.lesson_number];
    if (!selectedRating) {
      setMessage("Selecione uma avaliação antes de registrar.");
      return;
    }

    const existing = evaluations.find(
      (evaluation) => evaluation.lesson_number === lesson.lesson_number,
    );

    if (
      existing &&
      !window.confirm("Esta aula já possui uma avaliação. Deseja substituir a avaliação existente?")
    ) {
      return;
    }

    setLoading(true);
    const values = {
      teacher_id: profile.id,
      school_name: profile.school_name,
      segment: profile.segment,
      class_name: profile.class_name,
      bimester,
      lesson_number: lesson.lesson_number,
      lesson_rating: selectedRating,
      class_description: descriptions[lesson.lesson_number] || "",
      updated_at: new Date().toISOString(),
    };

    const result = existing
      ? await supabase.from("evaluations").update(values).eq("id", existing.id).select().single()
      : await supabase.from("evaluations").insert(values).select().single();

    setLoading(false);

    if (result.error) {
      setMessage("Não foi possível salvar. Verifique as permissões da sua turma.");
      return;
    }

    const saved = result.data as Evaluation;
    setEvaluations((current) =>
      existing
        ? current.map((item) => (item.id === existing.id ? saved : item))
        : [...current, saved],
    );
    setMessage("Avaliação registrada com sucesso.");
  }

  async function loadDirectorEvaluations() {
    if (!profile || !["diretor", "admin"].includes(profile.role)) {
      setMessage("Área exclusiva para contas autorizadas.");
      return;
    }

    setLoading(true);
    let query = supabase
      .from("evaluations")
      .select("*")
      .eq("segment", directorSegment)
      .eq("bimester", directorBimester)
      .order("class_name")
      .order("lesson_number");

    if (profile.role === "diretor") {
      query = query.eq("school_name", profile.school_name);
    }

    const { data, error } = await query;
    setLoading(false);

    if (error) {
      setMessage("Não foi possível consultar as avaliações.");
      return;
    }

    setEvaluations((data || []) as Evaluation[]);
    setView("director");
    setMessage("");
  }

  return (
    <main>
      <nav className="nav">
        <button className="brand" onClick={() => setView("home")}>
          <i>RC</i> Recreação <b>Catanduva</b>
        </button>
        <div>
          <button onClick={() => setView("home")}>Início</button>
          <button
            onClick={() => {
              setView("login");
              setMessage("");
            }}
          >
            Área do Professor
          </button>
          <button
            className="director"
            onClick={() => {
              setView("login");
              setMessage("Entre com uma conta autorizada para acessar a Área do Diretor.");
            }}
          >
            Área do Diretor
          </button>
          {session && <button onClick={signOut}>Sair</button>}
        </div>
      </nav>

      {view === "home" && (
        <section className="hero">
          <div className="heroText">
            <small>✦ EDUCAÇÃO INFANTIL • CATANDUVA</small>
            <h1>
              Recreação <em>Catanduva</em>
            </h1>
            <p>
              Transformamos momentos em memórias, aprendizado, alegria e sorrisos através de
              atividades lúdicas, promovendo o desenvolvimento infantil com muito carinho.
            </p>
            <div className="actions">
              <button
                className="primary"
                onClick={() => {
                  setView("login");
                  setMessage("");
                }}
              >
                Acessar o sistema →
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setView("signup");
                  setMessage("");
                }}
              >
                Criar conta de professor
              </button>
            </div>
            <label className="foot">✓ Avaliações organizadas por escola, segmento e turma</label>
          </div>
          <div className="art">
            <div className="artBall">◎</div>
            <strong>🎈 Hoje tem brincadeira</strong>
            <p>Brincar, aprender e crescer juntos.</p>
          </div>
        </section>
      )}

      {(view === "login" || view === "signup") && (
        <section className="auth">
          <div className="authCard">
            <button
              className="back"
              onClick={() => {
                setView("home");
                setMessage("");
              }}
            >
              ← Voltar ao início
            </button>
            <small>ACESSO SEGURO</small>
            <h2>{view === "signup" ? "Criar conta de professor" : "Bem-vindo de volta!"}</h2>
            <p>
              {view === "signup"
                ? "Vincule sua conta à escola, ao segmento e à sua turma."
                : "Entre para acessar suas avaliações."}
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (view === "signup") void registerAccount();
                else void signIn();
              }}
            >
              {view === "signup" && (
                <>
                  <label>
                    Nome completo
                    <input
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </label>
                  <label>
                    Escola
                    <select required value={school} onChange={(event) => setSchool(event.target.value)}>
                      <option value="">Selecione sua escola</option>
                      {SCHOOLS.map((item) => (
                        <option value={item} key={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="fields">
                    <label>
                      Segmento
                      <select value={segment} onChange={(event) => setSegment(event.target.value)}>
                        {SEGMENTS.map((item) => (
                          <option value={item} key={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Turma
                      <select value={className} onChange={(event) => setClassName(event.target.value)}>
                        {CLASSES.map((item) => (
                          <option value={item} key={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              )}

              <label>
                E-mail
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@escola.com.br"
                />
              </label>
              <label>
                Senha
                <input
                  required
                  minLength={6}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
              </label>
              <button className="primary wide" disabled={loading}>
                {loading ? "Aguarde..." : view === "signup" ? "Criar conta →" : "Entrar →"}
              </button>
            </form>

            <button
              className="switch"
              onClick={() => {
                setView(view === "signup" ? "login" : "signup");
                setMessage("");
              }}
            >
              {view === "signup" ? "Já tem conta? Entrar" : "Ainda não tem conta? Criar conta"}
            </button>
            {message && <div className="notice">{message}</div>}
            <small className="note">
              A Área do Diretor exige uma conta previamente autorizada pela administração.
            </small>
          </div>
        </section>
      )}

      {view === "app" && profile && (
        <section className="dashboard">
          <header>
            <div>
              <small>PAINEL DO PROFESSOR</small>
              <h2>Olá, {profile.full_name || "Professor(a)"}!</h2>
              <p>
                {profile.school_name} · {profile.segment} · Turma {profile.class_name}
              </p>
            </div>
            <button className="secondary" onClick={signOut}>
              Sair da conta
            </button>
          </header>

          {profile.role === "diretor" || profile.role === "admin" ? (
            <div className="panel">
              <h3>Área do Diretor</h3>
              <p>Consulte as avaliações da escola.</p>
              <div className="fields">
                <label>
                  Segmento
                  <select
                    value={directorSegment}
                    onChange={(event) => setDirectorSegment(event.target.value)}
                  >
                    {SEGMENTS.map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bimestre
                  <select
                    value={directorBimester}
                    onChange={(event) => setDirectorBimester(Number(event.target.value))}
                  >
                    {BIMESTERS.map((item) => (
                      <option value={item} key={item}>
                        {item}º bimestre
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="primary" onClick={() => void loadDirectorEvaluations()} disabled={loading}>
                Consultar avaliações →
              </button>
            </div>
          ) : (
            <>
              <div className="toolbar">
                <label>
                  Bimestre
                  <select
                    value={bimester}
                    onChange={(event) => setBimester(Number(event.target.value))}
                  >
                    {BIMESTERS.map((item) => (
                      <option value={item} key={item}>
                        {item}º bimestre
                      </option>
                    ))}
                  </select>
                </label>
                <b>
                  {evaluations.length} de {lessons.length} aulas avaliadas
                </b>
              </div>

              <div className="grid">
                {lessons.map((lesson) => {
                  const existing = evaluations.find(
                    (item) => item.lesson_number === lesson.lesson_number,
                  );
                  return (
                    <article className="lesson" key={lesson.id}>
                      <div className="between">
                        <small>AULA {lesson.lesson_number}</small>
                        <span className={existing ? "done" : "pending"}>
                          {existing ? "Avaliada" : "Pendente"}
                        </span>
                      </div>
                      <h3>{lesson.title || `Aula ${lesson.lesson_number}`}</h3>
                      <p className="lessonSummary">
                        {lesson.material_url
                          ? "Abra o material para visualizar a proposta e registrar sua avaliação."
                          : "Esta aula ainda não possui material anexado. Você pode registrar a avaliação."}
                      </p>
                      <button className="save" onClick={() => setSelectedLesson(lesson)}>
                        {lesson.material_url ? "Abrir material e avaliar" : "Avaliar aula"} →
                      </button>
                    </article>
                  );
                })}
              </div>

              {selectedLesson && (
                <div
                  className="lessonModalBackdrop"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setSelectedLesson(null);
                  }}
                >
                  <section className="lessonModal" role="dialog" aria-modal="true" aria-labelledby="lessonModalTitle">
                    <header className="lessonModalHeader">
                      <div>
                        <small>AULA {selectedLesson.lesson_number}</small>
                        <h2 id="lessonModalTitle">{selectedLesson.title || `Aula ${selectedLesson.lesson_number}`}</h2>
                        <p>Consulte o material e registre a avaliação desta aula.</p>
                      </div>
                      <button type="button" className="modalClose" aria-label="Fechar janela" onClick={() => setSelectedLesson(null)}>×</button>
                    </header>

                    {selectedLesson.material_url ? (
                      <div className="lessonMaterial">
                        <iframe
                          src={getMaterialEmbedUrl(selectedLesson.material_url)}
                          title={`Material da aula ${selectedLesson.lesson_number}`}
                          allow="autoplay; fullscreen; clipboard-write"
                          allowFullScreen
                        />
                        <a href={selectedLesson.material_url} target="_blank" rel="noreferrer">
                          Se o material não aparecer, abra em uma nova aba ↗
                        </a>
                      </div>
                    ) : (
                      <div className="materialMissing">
                        O material desta aula ainda não foi disponibilizado. Você pode preencher a avaliação abaixo.
                      </div>
                    )}

                    <div className="modalEvaluation">
                      <div className="between">
                        <h3>Avaliação da aula</h3>
                        <span className={evaluations.some((item) => item.lesson_number === selectedLesson.lesson_number) ? "done" : "pending"}>
                          {evaluations.some((item) => item.lesson_number === selectedLesson.lesson_number) ? "Já avaliada" : "Pendente"}
                        </span>
                      </div>
                      <label>
                        Como foi a realização desta aula?
                        <select
                          value={ratings[selectedLesson.lesson_number] || ""}
                          onChange={(event) => setRatings((current) => ({
                            ...current,
                            [selectedLesson.lesson_number]: event.target.value,
                          }))}
                        >
                          <option value="">Selecione...</option>
                          {RATINGS.map((rating) => <option value={rating} key={rating}>{rating}</option>)}
                        </select>
                      </label>
                      <label>
                        Observações sobre a realização da aula
                        <textarea
                          rows={4}
                          value={descriptions[selectedLesson.lesson_number] || ""}
                          onChange={(event) => setDescriptions((current) => ({
                            ...current,
                            [selectedLesson.lesson_number]: event.target.value,
                          }))}
                          placeholder="Registre observações, participação das crianças, adaptações ou pontos de atenção..."
                        />
                      </label>
                      <div className="modalActions">
                        <button type="button" className="secondary" onClick={() => setSelectedLesson(null)}>Fechar</button>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => void saveEvaluation(selectedLesson)}
                          disabled={loading}
                        >
                          {loading ? "Salvando..." : evaluations.some((item) => item.lesson_number === selectedLesson.lesson_number) ? "Substituir avaliação" : "Registrar avaliação"} →
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}

          {message && <div className="notice">{message}</div>}
        </section>
      )}

      {view === "director" && profile && (
        <section className="dashboard">
          <header>
            <div>
              <small>ÁREA DO DIRETOR</small>
              <h2>Avaliações da escola</h2>
              <p>
                {profile.school_name} · {directorSegment} · {directorBimester}º bimestre
              </p>
            </div>
            <button className="secondary" onClick={() => setView("app")}>
              Voltar ao painel
            </button>
          </header>

          <div className="panel tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Escola</th>
                  <th>Segmento</th>
                  <th>Turma</th>
                  <th>Aula</th>
                  <th>Avaliação</th>
                  <th>Observações</th>
                  <th>Conferência</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td>{evaluation.school_name}</td>
                    <td>{evaluation.segment}</td>
                    <td>{evaluation.class_name}</td>
                    <td>{evaluation.lesson_number}</td>
                    <td>{evaluation.lesson_rating}</td>
                    <td>{evaluation.class_description}</td>
                    <td>{evaluation.checked_at ? "Conferida" : "Pendente"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!evaluations.length && <p>Nenhuma avaliação encontrada.</p>}
          </div>

          <footer>
            <b>RC</b>
            <span>
              <strong>Recreação Catanduva</strong>
              <br />
              Diversão, aprendizado e cuidado.
            </span>
          </footer>
        </section>
      )}
    </main>
  );
}
