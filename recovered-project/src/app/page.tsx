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
  checked_by: string | null;
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<"home" | "login" | "signup" | "directorSignup" | "app" | "director" | "educa">("home");

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
  const [directorClass, setDirectorClass] = useState("Todas");
  const [directorStatus, setDirectorStatus] = useState<"todas" | "pendentes" | "conferidas">("todas");
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

    const isDirectorSignup = view === "directorSignup";
    if (!fullName.trim() || !school || !email.trim() || password.length < 8) {
      setMessage("Preencha todos os campos. A senha deve ter pelo menos 8 caracteres.");
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
          account_type: isDirectorSignup ? "director" : "teacher",
          segment: isDirectorSignup ? null : segment,
          class_name: isDirectorSignup ? null : className,
        },
      },
    });
    setLoading(false);

    setMessage(
      error
        ? error.message
        : isDirectorSignup
          ? "Cadastro de diretor solicitado! Confirme seu e-mail, se solicitado. Sua conta ficará vinculada à escola selecionada."
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
      const host = url.hostname.replace("www.", "");
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (host === "youtu.be" && pathParts[0]) {
        return `https://www.youtube-nocookie.com/embed/${pathParts[0]}`;
      }
      if (host.includes("youtube.com")) {
        const videoId = url.searchParams.get("v");
        if (url.pathname.startsWith("/embed/")) return rawUrl;
        if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
      }
      if (host.includes("drive.google.com")) {
        const fileId = pathParts[0] === "file" && pathParts[1] === "d" ? pathParts[2] : null;
        if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
      }
      if (host === "docs.google.com" && ["document", "presentation", "spreadsheets"].includes(pathParts[0])) {
        if (url.pathname.endsWith("/edit") || url.pathname.endsWith("/view")) {
          return url.origin + url.pathname.replace(/\/(edit|view)$/, "/preview");
        }
        return rawUrl;
      }
      if (host.includes("vimeo.com") && pathParts[0] && /^\d+$/.test(pathParts[0])) {
        return `https://player.vimeo.com/video/${pathParts[0]}`;
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
    setDirectorClass("Todas");
    setDirectorStatus("todas");
    setView("director");
    setMessage("");
  }

  async function confirmDirectorEvaluation(evaluation: Evaluation) {
    if (!profile || !["diretor", "admin"].includes(profile.role) || evaluation.checked_at) return;

    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("evaluations")
      .update({
        checked_by: profile.id,
        checked_at: new Date().toISOString(),
      })
      .eq("id", evaluation.id)
      .is("checked_at", null)
      .select("*")
      .maybeSingle();
    setLoading(false);

    if (error) {
      setMessage("Não foi possível confirmar esta avaliação. Atualize a consulta e tente novamente.");
      return;
    }
    if (!data) {
      setMessage("Esta avaliação já foi conferida. A lista será atualizada.");
      await loadDirectorEvaluations();
      return;
    }

    setEvaluations((current) =>
      current.map((item) => item.id === evaluation.id ? (data as Evaluation) : item),
    );
    setMessage("Avaliação confirmada com sucesso.");
  }

  async function confirmAllVisibleEvaluations() {
    if (!profile || !["diretor", "admin"].includes(profile.role)) return;

    const pending = directorVisibleEvaluations.filter((item) => !item.checked_at);
    if (!pending.length) {
      setMessage("Não há avaliações pendentes para conferir neste filtro.");
      return;
    }

    const confirmed = window.confirm(
      `Deseja conferir todas as ${pending.length} avaliações pendentes que estão sendo exibidas?`,
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    const ids = pending.map((item) => item.id);
    const { data, error } = await supabase
      .from("evaluations")
      .update({
        checked_by: profile.id,
        checked_at: new Date().toISOString(),
      })
      .in("id", ids)
      .is("checked_at", null)
      .select("*");
    setLoading(false);

    if (error) {
      setMessage("Não foi possível conferir todas as avaliações. Atualize a lista e tente novamente.");
      return;
    }

    const updatedById = new Map((data || []).map((item) => [item.id, item as Evaluation]));
    setEvaluations((current) => current.map((item) => updatedById.get(item.id) || item));
    setMessage(`${(data || []).length} avaliação(ões) conferida(s) com sucesso.`);
  }

  const directorVisibleEvaluations = evaluations.filter((evaluation) => {
    const classMatches = directorClass === "Todas" || evaluation.class_name === directorClass;
    const statusMatches =
      directorStatus === "todas" ||
      (directorStatus === "pendentes" && !evaluation.checked_at) ||
      (directorStatus === "conferidas" && !!evaluation.checked_at);
    return classMatches && statusMatches;
  });
  const directorPendingCount = evaluations.filter((item) => !item.checked_at).length;
  const directorCheckedCount = evaluations.filter((item) => !!item.checked_at).length;

  return (
    <main>
      <nav className="nav">
        <button className="brand" onClick={() => setView("home")}>
          <i>RC</i> Recreação <b>Catanduva</b>
        </button>
        <div>
          <button onClick={() => setView("home")}>Início</button>
          <button className="educaNav" onClick={() => { setView("educa"); setMessage(""); }}>Educa I.A.</button>
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
              setMessage("Entre com seu e-mail e senha ou crie o cadastro de diretor da sua escola.");
            }}
          >
            Área do Diretor
          </button>
          {session && <button onClick={signOut}>Sair</button>}
        </div>
      </nav>

      {view === "home" && (
        <>
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
          <div className="heroVisual" aria-label="Painel ilustrativo de atividades educativas">
            <div className="visualGlow" />
            <div className="floatingShape shapeOne">✦</div>
            <div className="floatingShape shapeTwo">●</div>
            <div className="activityCard">
              <div className="activityCardTop">
                <span className="activityIcon">✿</span>
                <span className="activityTag">APRENDER BRINCANDO</span>
              </div>
              <div className="activityIllustration">
                <div className="sunShape" />
                <div className="rainbowShape"><i /><i /><i /></div>
                <div className="ballShape ballBlue" />
                <div className="ballShape ballOrange" />
                <div className="blockShape blockYellow" />
                <div className="blockShape blockPurple" />
              </div>
              <div className="activityCardBottom">
                <div>
                  <strong>Pequenas descobertas,</strong>
                  <span>grandes possibilidades.</span>
                </div>
                <span className="arrowBubble">↗</span>
              </div>
            </div>
            <div className="floatingNote noteTop"><span>✦</span> Criatividade</div>
            <div className="floatingNote noteBottom"><span>♡</span> Cuidado em cada detalhe</div>
          </div>
        </section>
        <section className="homeHighlights" aria-label="Nossos valores">
          <div className="highlightIntro">
            <small>NOSSO PROPÓSITO</small>
            <h2>Um espaço para <em>crescer e descobrir.</em></h2>
          </div>
          <article className="highlightCard highlightBlue">
            <span className="highlightIcon">✦</span>
            <h3>Aprendizagem</h3>
            <p>Experiências que despertam a curiosidade e valorizam cada descoberta.</p>
          </article>
          <article className="highlightCard highlightOrange">
            <span className="highlightIcon">♡</span>
            <h3>Acolhimento</h3>
            <p>Um olhar atento e cuidadoso para respeitar o ritmo de cada criança.</p>
          </article>
          <article className="highlightCard highlightYellow">
            <span className="highlightIcon">✿</span>
            <h3>Brincadeira</h3>
            <p>O brincar como caminho para explorar, conviver e aprender.</p>
          </article>
        </section>
        </>
      )}

      {view === "educa" && (
        <section className="educaPage">
          <div className="educaHero">
            <button className="back" onClick={() => setView("home")}>← Voltar ao início</button>
            <div className="educaEyebrow"><span>✦</span> INTELIGÊNCIA ARTIFICIAL NA EDUCAÇÃO</div>
            <h1>Educa <em>I.A.</em></h1>
            <p>Ferramentas inteligentes para apoiar o planejamento, a documentação pedagógica e o desenvolvimento de experiências de aprendizagem.</p>
          </div>
          <div className="educaToolsHeading">
            <div><small>ESPAÇO DE FERRAMENTAS</small><h2>O que vamos criar hoje?</h2></div>
            <span>4 ferramentas</span>
          </div>
          <div className="educaToolsGrid">
            <article className="educaToolCard educaToolBlue">
              <div className="educaToolTop"><span className="educaToolIcon">✎</span><span className="educaToolNumber">01</span></div>
              <h3>Criador de Aula</h3>
              <p>Planeje aulas completas com propostas lúdicas, objetivos de aprendizagem, materiais e vivências adequadas à Educação Infantil.</p>
              <div className="educaToolFooter"><span>Planejamento pedagógico</span><span className="educaToolArrow">↗</span></div>
            </article>
            <article className="educaToolCard educaToolOrange">
              <div className="educaToolTop"><span className="educaToolIcon">▤</span><span className="educaToolNumber">02</span></div>
              <h3>Relatório Individual</h3>
              <p>Organize observações e registros do desenvolvimento da criança em um relatório claro, cuidadoso e individualizado.</p>
              <div className="educaToolFooter"><span>Documentação pedagógica</span><span className="educaToolArrow">↗</span></div>
            </article>
            <article className="educaToolCard educaToolPurple">
              <div className="educaToolTop"><span className="educaToolIcon">♡</span><span className="educaToolNumber">03</span></div>
              <h3>P.E.I.</h3>
              <p>Estruture um Plano Educacional Individualizado considerando potencialidades, necessidades, estratégias e acompanhamento.</p>
              <div className="educaToolFooter"><span>Inclusão e acompanhamento</span><span className="educaToolArrow">↗</span></div>
            </article>
            <article className="educaToolCard educaToolGreen">
              <div className="educaToolTop"><span className="educaToolIcon">✧</span><span className="educaToolNumber">04</span></div>
              <h3>Projeto</h3>
              <p>Desenvolva projetos pedagógicos com tema, justificativa, objetivos, etapas, experiências e formas de avaliação.</p>
              <div className="educaToolFooter"><span>Projetos e experiências</span><span className="educaToolArrow">↗</span></div>
            </article>
          </div>
          <div className="educaNote"><span>✦</span><p><strong>Educar com criatividade, planejar com inteligência.</strong><br/>Um espaço de apoio ao trabalho pedagógico, com o olhar humano sempre no centro.</p></div>
        </section>
      )}

      {(view === "login" || view === "signup" || view === "directorSignup") && (
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
            <h2>
              {view === "signup" ? "Criar conta de professor" : view === "directorSignup" ? "Cadastro do diretor" : "Bem-vindo de volta!"}
            </h2>
            <p>
              {view === "signup"
                ? "Vincule sua conta à escola, ao segmento e à sua turma."
                : view === "directorSignup"
                  ? "Cadastre-se com e-mail e senha para conferir as avaliações da sua escola."
                  : "Entre para acessar suas avaliações."}
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (view === "signup" || view === "directorSignup") void registerAccount();
                else void signIn();
              }}
            >
              {(view === "signup" || view === "directorSignup") && (
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
                  {view === "signup" && <div className="fields">
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
                  </div>}
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
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                />
              </label>
              <button className="primary wide" disabled={loading}>
                {loading ? "Aguarde..." : view === "signup" || view === "directorSignup" ? "Criar conta →" : "Entrar →"}
              </button>
            </form>

            {view !== "directorSignup" && (
              <button
                className="switch"
                onClick={() => {
                  setView(view === "signup" ? "login" : "signup");
                  setMessage("");
                }}
              >
                {view === "signup" ? "Já tem conta? Entrar" : "Ainda não tem conta? Criar conta de professor"}
              </button>
            )}
            {view === "login" && (
              <button
                className="switch directorSignupLink"
                onClick={() => {
                  setView("directorSignup");
                  setMessage("");
                  setFullName("");
                  setSchool("");
                }}
              >
                Primeiro acesso como diretor? Cadastre sua escola →
              </button>
            )}
            {view === "directorSignup" && (
              <button className="switch" onClick={() => { setView("login"); setMessage(""); }}>
                Já possui cadastro? Entrar
              </button>
            )}
            {message && <div className="notice">{message}</div>}
            <small className="note">
              {view === "directorSignup"
                ? "Cada escola pode ter somente um cadastro de diretor. Quando a vaga da escola já estiver ocupada, um novo cadastro será recusado."
                : "A conta de diretor é vinculada à escola selecionada e somente uma conta pode ocupar essa função por escola."}
            </small>
          </div>
        </section>
      )}

      {view === "app" && profile && (
        <section className="dashboard">
          <header>
            <div>
              <small>{profile.role === "diretor" || profile.role === "admin" ? "PAINEL DO DIRETOR" : "PAINEL DO PROFESSOR"}</small>
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
                    className={`directorSegmentSelect directorSegment${SEGMENTS.indexOf(directorSegment) + 1}`}
                    value={directorSegment}
                    onChange={(event) => setDirectorSegment(event.target.value)}
                  >
                    {SEGMENTS.map((item, index) => (
                      <option
                        className={`directorSegmentOption directorSegmentOption${index + 1}`}
                        value={item}
                        key={item}
                      >
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
              <section className="bimesterSection" aria-label="Escolha do bimestre">
                <div className="bimesterSectionHeading">
                  <div>
                    <small>ORGANIZE SUAS AVALIAÇÕES</small>
                    <h3>Escolha o bimestre</h3>
                  </div>
                  <b>{evaluations.length} de {lessons.length} aulas avaliadas</b>
                </div>
                <div className="bimesterCards">
                  {BIMESTERS.map((item, index) => (
                    <button
                      type="button"
                      key={item}
                      className={`bimesterCard bimesterCard${index + 1}${bimester === item ? " active" : ""}`}
                      onClick={() => setBimester(item)}
                      aria-pressed={bimester === item}
                    >
                      <span className="bimesterCardNumber">{item}º</span>
                      <span className="bimesterCardLabel">Bimestre</span>
                      <span className="bimesterCardAction">{bimester === item ? "Selecionado" : "Clique para acessar"}</span>
                    </button>
                  ))}
                </div>
                <div className="evaluationProgress" aria-label={`Progresso das aulas avaliadas: ${evaluations.length} de ${lessons.length}`}>
                  <div className="evaluationProgressLabels">
                    <span>Progresso das avaliações</span>
                    <strong>{lessons.length ? Math.round((evaluations.length / lessons.length) * 100) : 0}%</strong>
                  </div>
                  <div
                    className="evaluationProgressTrack"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={lessons.length}
                    aria-valuenow={evaluations.length}
                    aria-label="Aulas avaliadas"
                  >
                    <div
                      className="evaluationProgressFill"
                      style={{ width: `${lessons.length ? Math.min(100, (evaluations.length / lessons.length) * 100) : 0}%` }}
                    />
                  </div>
                  <small>{evaluations.length} de {lessons.length} aulas avaliadas</small>
                </div>
              </section>

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
            <div className="directorHeaderActions">
              <button className="secondary" onClick={() => window.print()}>
                Imprimir avaliações
              </button>
              <button
                className="primary"
                onClick={() => void confirmAllVisibleEvaluations()}
                disabled={loading || !directorVisibleEvaluations.some((item) => !item.checked_at)}
              >
                {loading ? "Aguarde..." : "Conferir todas"}
              </button>
              <button className="secondary" onClick={() => setView("app")}>
                Voltar ao painel
              </button>
            </div>
          </header>

          <div className="directorSummary">
            <article className="directorMetric directorMetricBlue">
              <span>Total de avaliações</span>
              <strong>{evaluations.length}</strong>
              <small>Registros no filtro selecionado</small>
            </article>
            <article className="directorMetric directorMetricAmber">
              <span>Aguardando conferência</span>
              <strong>{directorPendingCount}</strong>
              <small>Avaliações ainda pendentes</small>
            </article>
            <article className="directorMetric directorMetricGreen">
              <span>Conferidas</span>
              <strong>{directorCheckedCount}</strong>
              <small>Confirmações registradas</small>
            </article>
          </div>

          <div className="directorFilters">
            <label>
              Turma
              <select value={directorClass} onChange={(event) => setDirectorClass(event.target.value)}>
                <option value="Todas">Todas as turmas</option>
                {CLASSES.map((item) => <option value={item} key={item}>Turma {item}</option>)}
              </select>
            </label>
            <label>
              Situação
              <select
                value={directorStatus}
                onChange={(event) => setDirectorStatus(event.target.value as "todas" | "pendentes" | "conferidas")}
              >
                <option value="todas">Todas</option>
                <option value="pendentes">Aguardando conferência</option>
                <option value="conferidas">Conferidas</option>
              </select>
            </label>
            <span className="directorResultCount">{directorVisibleEvaluations.length} registro(s)</span>
          </div>

          <div className="panel tableWrap directorTablePanel">
            <table className="directorTable">
              <thead>
                <tr>
                  <th>Turma</th>
                  <th>Aula</th>
                  <th>Avaliação</th>
                  <th>Observações do professor</th>
                  <th>Situação</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {directorVisibleEvaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td><strong className="classPill">Turma {evaluation.class_name}</strong></td>
                    <td>{evaluation.lesson_number}</td>
                    <td>
                      <span className={evaluation.lesson_rating === "Boa" ? "ratingGood" : evaluation.lesson_rating === "Regular" ? "ratingRegular" : "ratingReview"}>
                        {evaluation.lesson_rating}
                      </span>
                    </td>
                    <td className="directorObservation">{evaluation.class_description?.trim() || "Sem observações registradas."}</td>
                    <td>
                      {evaluation.checked_at ? (
                        <span className="statusChecked">✓ Conferida</span>
                      ) : (
                        <span className="statusWaiting">Aguardando</span>
                      )}
                      {evaluation.checked_at && (
                        <small className="checkedDate">
                          {new Date(evaluation.checked_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </small>
                      )}
                    </td>
                    <td>
                      {evaluation.checked_at ? (
                        <span className="confirmedLabel">Conferência concluída</span>
                      ) : (
                        <button
                          className="confirmEvaluation"
                          onClick={() => void confirmDirectorEvaluation(evaluation)}
                          disabled={loading}
                        >
                          {loading ? "Salvando..." : "Confirmar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!evaluations.length && <div className="directorEmpty"><strong>Nenhuma avaliação encontrada.</strong><span>Quando os professores registrarem avaliações deste segmento e bimestre, elas aparecerão aqui.</span></div>}
            {!!evaluations.length && !directorVisibleEvaluations.length && <div className="directorEmpty"><strong>Nenhum resultado para estes filtros.</strong><span>Altere a turma ou a situação para visualizar outros registros.</span></div>}
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
