import { useState, useRef, useEffect, useCallback } from "react";

const scoreColor = s => s >= 75 ? "#10b981" : s >= 55 ? "#f59e0b" : s >= 35 ? "#f97316" : "#ef4444";
const gradeColor = g => ({ "A+": "#10b981", A: "#10b981", "B+": "#f59e0b", B: "#f59e0b", C: "#f97316", D: "#ef4444" }[g] || "#64748b");
const rankIcon   = r => r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `#${r}`;

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const r = new FileReader();
      r.onload = e => {
        const bytes = new Uint8Array(e.target.result);
        let text = "";
        for (let i = 0; i < bytes.length; i++) {
          const c = bytes[i];
          if (c >= 32 && c < 127) text += String.fromCharCode(c);
          else if (c === 10 || c === 13) text += "\n";
        }
        const cleaned = text.replace(/[^\x20-\x7E\n]/g," ").replace(/\(([^)]{2,200})\)/g,"$1 ").replace(/\/[A-Za-z]{1,20}\s/g," ").replace(/\s{3,}/g,"\n").trim();
        resolve(cleaned.length > 80 ? cleaned : text);
      };
      r.onerror = () => reject(new Error("PDF read failed"));
      r.readAsArrayBuffer(file);
    } else {
      const r = new FileReader();
      r.onload = e => resolve(e.target.result);
      r.onerror = () => reject(new Error("File read failed"));
      r.readAsText(file);
    }
  });
}

async function scoreResumeWithAI(resumeText, jobDescription, jobTitle, keySkills) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are an expert HR AI system. Analyze the resume against the job description and return ONLY a valid JSON object. No markdown, no backticks, no explanation — pure JSON only.

JOB TITLE: ${jobTitle}
KEY SKILLS: ${keySkills}
JOB DESCRIPTION: ${jobDescription.slice(0,1400)}
RESUME: ${resumeText.slice(0,2400)}

Return this exact JSON:
{"candidate_name":"full name from resume or file name","total_score":<0-100 overall fit>,"grade":"<A+|A|B+|B|C|D>","recommendation":"<Strongly Recommended|Recommended|Consider|Weak Match|Not Recommended>","years_experience":<number>,"education_level":"<PhD|Master's|Bachelor's|Associate/Diploma|None detected>","breakdown":{"tfidf_similarity":<0-100>,"keyword_match":<0-100>,"skill_match":<0-100>,"education_score":<0-100>,"experience_score":<0-100>,"completeness":<0-100>},"matched_skills":["skills","found","matching","job"],"missing_skills":["important","skills","from","JD","not","in","resume"],"top_keywords":["key","terms","from","resume"],"contact":{"email":"email or null","phone":"phone or null","linkedin":"url or null"},"summary":"2-sentence professional assessment of fit"}`
      }]
    })
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  const data = await response.json();
  const text = data.content.map(b => b.text || "").join("").replace(/```json|```/g,"").trim();
  return JSON.parse(text);
}

function AnimatedScore({ value, color }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    let start = null;
    const step = ts => { if (!start) start = ts; const p = Math.min((ts-start)/1200,1); setD(+(p*value).toFixed(1)); if(p<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [value]);
  return <span style={{color}}>{d}<span style={{fontSize:"0.85rem",opacity:0.5}}>%</span></span>;
}

function Bar({ label, val, weight }) {
  const [w, setW] = useState(0);
  useEffect(() => { setTimeout(() => setW(val), 150); }, [val]);
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontFamily:"monospace",fontSize:"0.63rem",color:"#5a7a99",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label} <span style={{color:"#00e5ff"}}>{weight}</span></span>
        <span style={{fontWeight:700,fontSize:"0.8rem",color:scoreColor(val)}}>{val.toFixed(1)}%</span>
      </div>
      <div style={{height:5,background:"#1e2d42",borderRadius:100,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${w}%`,background:scoreColor(val),borderRadius:100,transition:"width 0.9s cubic-bezier(0.4,0,0.2,1)"}}/>
      </div>
    </div>
  );
}

function CandidateCard({ r, index }) {
  const [open, setOpen] = useState(index === 0);
  const [bw, setBw] = useState(0);
  useEffect(() => { setTimeout(() => setBw(r.total_score), 200+index*80); }, []);
  const bc = r.rank===1?"rgba(245,158,11,0.5)":r.rank===2?"rgba(148,163,184,0.35)":r.rank===3?"rgba(180,120,60,0.35)":"#1e2d42";

  return (
    <div style={{background:"#0e1520",border:`1px solid ${bc}`,borderRadius:14,marginBottom:12,overflow:"hidden",transition:"transform 0.15s,box-shadow 0.15s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.35)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>

      <div style={{display:"flex",alignItems:"center",gap:14,padding:"17px 22px",flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{flexShrink:0,width:46,height:46,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:r.rank<=3?"1.4rem":"0.95rem",background:r.rank===1?"linear-gradient(135deg,#f59e0b,#f97316)":r.rank===2?"linear-gradient(135deg,#94a3b8,#e2e8f0)":r.rank===3?"linear-gradient(135deg,#b45309,#d97706)":"#131d2b",border:r.rank>3?"1px solid #1e2d42":"none",color:r.rank<=3?"#000":"#5a7a99"}}>
          {rankIcon(r.rank)}
        </div>
        <div style={{flex:1,minWidth:140}}>
          <div style={{fontWeight:700,fontSize:"0.98rem",marginBottom:3}}>{r.candidate_name}</div>
          <div style={{fontFamily:"monospace",fontSize:"0.62rem",color:"#5a7a99"}}>{r.filename} · {r.years_experience}yr · {r.education_level}</div>
        </div>
        <div style={{flex:1,minWidth:120}}>
          <div style={{height:6,background:"#1e2d42",borderRadius:100,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${bw}%`,background:scoreColor(r.total_score),borderRadius:100,transition:"width 1s cubic-bezier(0.4,0,0.2,1)"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:5,alignItems:"center"}}>
            <span style={{fontFamily:"monospace",fontSize:"0.59rem",color:"#5a7a99"}}>{r.percentile}th pct</span>
            <span style={{fontFamily:"monospace",fontSize:"0.62rem",background:`${gradeColor(r.grade)}20`,border:`1px solid ${gradeColor(r.grade)}40`,color:gradeColor(r.grade),padding:"2px 8px",borderRadius:100}}>{r.grade}</span>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:"1.85rem",lineHeight:1}}><AnimatedScore value={r.total_score} color={scoreColor(r.total_score)}/></div>
          <div style={{fontFamily:"monospace",fontSize:"0.59rem",color:"#5a7a99",marginTop:3}}>{r.recommendation}</div>
        </div>
        <div style={{color:"#5a7a99",transition:"transform 0.2s",transform:open?"rotate(180deg)":""}}>▾</div>
      </div>

      {open && (
        <div style={{borderTop:"1px solid #1e2d42",padding:"18px 22px 22px",animation:"fadeIn 0.2s ease"}}>
          {r.summary && <div style={{background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.15)",borderRadius:10,padding:"11px 15px",marginBottom:16,fontSize:"0.83rem",color:"#9ab5cc",lineHeight:1.65}}>💡 {r.summary}</div>}
          <div style={{marginBottom:14}}>
            <Bar label="TF-IDF Similarity" val={r.breakdown?.tfidf_similarity||0} weight="40%"/>
            <Bar label="Keyword Match"     val={r.breakdown?.keyword_match||0}    weight="30%"/>
            <Bar label="Skill Overlap"     val={r.breakdown?.skill_match||0}      weight="20%"/>
            <Bar label="Education"         val={r.breakdown?.education_score||0}  weight="5%"/>
            <Bar label="Experience"        val={r.breakdown?.experience_score||0} weight="5%"/>
            <Bar label="Completeness"      val={r.breakdown?.completeness||0}     weight="bonus"/>
          </div>
          {r.matched_skills?.length>0 && <div style={{marginBottom:11}}>
            <div style={{fontFamily:"monospace",fontSize:"0.62rem",color:"#5a7a99",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:7}}>✅ Matched Skills</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{r.matched_skills.slice(0,12).map(s=><span key={s} style={{fontFamily:"monospace",fontSize:"0.67rem",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.28)",color:"#10b981",padding:"3px 10px",borderRadius:100}}>{s}</span>)}</div>
          </div>}
          {r.missing_skills?.length>0 && <div style={{marginBottom:11}}>
            <div style={{fontFamily:"monospace",fontSize:"0.62rem",color:"#5a7a99",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:7}}>⚠ Missing Skills</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{r.missing_skills.slice(0,8).map(s=><span key={s} style={{fontFamily:"monospace",fontSize:"0.67rem",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.22)",color:"#fc8181",padding:"3px 10px",borderRadius:100}}>{s}</span>)}</div>
          </div>}
          {r.top_keywords?.length>0 && <div style={{marginBottom:11}}>
            <div style={{fontFamily:"monospace",fontSize:"0.62rem",color:"#5a7a99",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:7}}>🔑 Top Keywords</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{r.top_keywords.slice(0,10).map(k=><span key={k} style={{fontFamily:"monospace",fontSize:"0.65rem",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",color:"#a5b4fc",padding:"3px 10px",borderRadius:100}}>{k}</span>)}</div>
          </div>}
          {r.contact&&(r.contact.email||r.contact.phone||r.contact.linkedin)&&(
            <div style={{display:"flex",gap:18,flexWrap:"wrap",fontSize:"0.77rem",color:"#5a7a99",marginTop:8,paddingTop:12,borderTop:"1px solid #1e2d42"}}>
              {r.contact.email&&<span>📧 {r.contact.email}</span>}
              {r.contact.phone&&<span>📞 {r.contact.phone}</span>}
              {r.contact.linkedin&&<span>🔗 {r.contact.linkedin}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({ name, status }) {
  const cfg = {done:{icon:"✅",color:"#10b981"},error:{icon:"❌",color:"#ef4444"},processing:{icon:"⏳",color:"#00e5ff"},waiting:{icon:"🕐",color:"#5a7a99"}};
  const c = cfg[status]||cfg.waiting;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1e2d42"}}>
      <span>{c.icon}</span>
      <span style={{fontFamily:"monospace",fontSize:"0.72rem",flex:1,color:c.color}}>{name}</span>
      <span style={{fontFamily:"monospace",fontSize:"0.6rem",color:c.color,textTransform:"uppercase"}}>{status}</span>
    </div>
  );
}

export default function App() {
  const [screen, setScreen]       = useState("upload");
  const [jobTitle, setJobTitle]   = useState("Senior Machine Learning Engineer");
  const [jobDesc, setJobDesc]     = useState("We are looking for a Senior Machine Learning Engineer with 5+ years of experience building and deploying production ML systems. Strong expertise in Python, TensorFlow or PyTorch, and cloud platforms (AWS or GCP). Responsibilities include designing scalable ML pipelines, performing statistical analysis, collaborating with cross-functional teams, and mentoring junior engineers. Experience with SQL, Docker, Kubernetes, Spark, and Airflow is preferred. Master's degree in Computer Science or related field required.");
  const [keySkills, setKeySkills] = useState("Python, TensorFlow, PyTorch, Docker, AWS, SQL, Kubernetes, Spark, Airflow");
  const [files, setFiles]         = useState([]);
  const [dragOver, setDragOver]   = useState(false);
  const [fileStatuses, setFileStatuses] = useState({});
  const [results, setResults]     = useState([]);
  const [error, setError]         = useState("");
  const [progress, setProgress]   = useState({ current: 0, total: 0, label: "" });
  const fileInputRef = useRef();

  const addFiles = useCallback(newFiles => {
    const valid = [...newFiles].filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["pdf","txt"].includes(ext) && f.size < 5*1024*1024;
    });
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))].slice(0, 20);
    });
  }, []);

  const removeFile = name => setFiles(prev => prev.filter(f => f.name !== name));

  const runAnalysis = async () => {
    if (!files.length) { setError("Please upload at least one resume."); return; }
    if (jobDesc.length < 50) { setError("Job description must be at least 50 characters."); return; }
    setError("");
    setScreen("processing");
    const statuses = {};
    files.forEach(f => { statuses[f.name] = "waiting"; });
    setFileStatuses({...statuses});
    const scored = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i+1, total: files.length, label: `Analyzing ${file.name}…` });
      setFileStatuses(prev => ({...prev, [file.name]: "processing"}));
      try {
        const text = await readFileAsText(file);
        if (!text || text.trim().length < 60) throw new Error("Could not extract enough text from this file.");
        const result = await scoreResumeWithAI(text, jobDesc, jobTitle, keySkills);
        result.filename = file.name;
        scored.push(result);
        setFileStatuses(prev => ({...prev, [file.name]: "done"}));
      } catch (err) {
        setFileStatuses(prev => ({...prev, [file.name]: "error"}));
        scored.push({ filename: file.name, candidate_name: file.name.replace(/\.[^.]+$/,""), total_score: 0, grade: "D", recommendation: "Error", years_experience: 0, education_level: "Unknown", breakdown: {tfidf_similarity:0,keyword_match:0,skill_match:0,education_score:0,experience_score:0,completeness:0}, matched_skills:[], missing_skills:[], top_keywords:[], contact:{}, summary:`Processing error: ${err.message}` });
      }
    }

    scored.sort((a,b) => b.total_score - a.total_score);
    scored.forEach((r,i) => { r.rank = i+1; r.percentile = Math.round(((scored.length-i)/scored.length)*100); });
    setResults(scored);
    setTimeout(() => setScreen("results"), 700);
  };

  const downloadCSV = () => {
    const rows = [
      [`AI Resume Ranking Report — ${jobTitle}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Total Candidates: ${results.length}`],
      [],
      ["Rank","Candidate","File","Grade","Score (%)","TF-IDF (%)","Keyword (%)","Skill (%)","Edu (%)","Exp (%)","Years Exp","Education","Matched Skills","Missing Skills","Recommendation","Percentile","Email","Phone"],
      ...results.map(r => [r.rank,r.candidate_name,r.filename,r.grade,r.total_score,r.breakdown?.tfidf_similarity,r.breakdown?.keyword_match,r.breakdown?.skill_match,r.breakdown?.education_score,r.breakdown?.experience_score,r.years_experience,r.education_level,(r.matched_skills||[]).join("; "),(r.missing_skills||[]).join("; "),r.recommendation,r.percentile,r.contact?.email||"",r.contact?.phone||""])
    ];
    const csv = rows.map(r => r.map(c=>`"${String(c??"")}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download = `talentrank_${jobTitle.replace(/\s+/g,"_")}.csv`; a.click();
  };

  const avg = results.length ? (results.reduce((s,r)=>s+r.total_score,0)/results.length).toFixed(1) : "—";
  const topScore = results[0]?.total_score ?? 0;
  const strongRec = results.filter(r=>r.total_score>=75).length;

  const cs = { background:"#080c14",minHeight:"100vh",color:"#e2eaf4",fontFamily:"'Segoe UI',system-ui,sans-serif",position:"relative" };
  const card = { background:"#0e1520",border:"1px solid #1e2d42",borderRadius:16,overflow:"hidden",marginBottom:20 };
  const inp = { width:"100%",background:"#131d2b",border:"1px solid #1e2d42",borderRadius:10,padding:"11px 14px",color:"#e2eaf4",fontFamily:"inherit",fontSize:"0.88rem",outline:"none",boxSizing:"border-box" };
  const lbl = { display:"block",fontFamily:"monospace",fontSize:"0.66rem",letterSpacing:"0.08em",color:"#00e5ff",textTransform:"uppercase",marginBottom:8 };
  const btn2 = { display:"inline-flex",alignItems:"center",gap:6,background:"transparent",border:"1px solid #1e2d42",color:"#e2eaf4",fontFamily:"monospace",fontSize:"0.68rem",padding:"9px 16px",borderRadius:10,cursor:"pointer",transition:"all 0.2s" };

  return (
    <div style={cs}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}input:focus,textarea:focus{border-color:rgba(0,229,255,0.4)!important;box-shadow:0 0 0 3px rgba(0,229,255,0.07);}`}</style>
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(0,229,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.025) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",top:-200,left:"50%",transform:"translateX(-50%)",width:800,height:600,background:"radial-gradient(ellipse,rgba(0,229,255,0.06) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(8,12,20,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid #1e2d42"}}>
        <div style={{fontWeight:800,fontSize:"1.2rem",letterSpacing:"-0.5px"}}>Talent<span style={{color:"#00e5ff"}}>Rank</span> AI</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {screen==="results" && <button style={btn2} onClick={()=>{setScreen("upload");setResults([]);setFiles([]);}}>← New Analysis</button>}
          <div style={{fontFamily:"monospace",fontSize:"0.66rem",letterSpacing:"0.12em",color:"#00e5ff",border:"1px solid rgba(0,229,255,0.3)",padding:"5px 14px",borderRadius:100,background:"rgba(0,229,255,0.05)"}}>NLP · TF-IDF · AI</div>
        </div>
      </nav>

      <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 80px",position:"relative",zIndex:1}}>

        {/* HERO */}
        <div style={{textAlign:"center",padding:"52px 20px 34px",animation:"slideUp 0.5s ease"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"monospace",fontSize:"0.67rem",letterSpacing:"0.14em",color:"#00e5ff",background:"rgba(0,229,255,0.07)",border:"1px solid rgba(0,229,255,0.2)",padding:"5px 14px",borderRadius:100,marginBottom:20}}>
            <span style={{width:6,height:6,background:"#00e5ff",borderRadius:"50%",display:"inline-block",animation:"pulse 2s infinite"}}/>
            CLAUDE AI · REAL-TIME NLP SCORING
          </div>
          <h1 style={{fontWeight:800,fontSize:"clamp(1.9rem,5vw,3.3rem)",letterSpacing:"-2px",lineHeight:1.05,marginBottom:14}}>
            AI-Powered Resume<br/>
            <span style={{background:"linear-gradient(135deg,#00e5ff 0%,#6366f1 50%,#7c3aed 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Intelligence Platform</span>
          </h1>
          <p style={{color:"#5a7a99",maxWidth:490,margin:"0 auto",lineHeight:1.65}}>
            Upload real resumes (PDF or TXT), define your job profile, and get Claude AI-powered scores with full NLP breakdowns — matched skills, gaps, education, experience, and more.
          </p>
        </div>

        {/* ── UPLOAD ──────────────────────────────────────── */}
        {screen==="upload" && (
          <div style={{animation:"slideUp 0.4s ease"}}>
            {error && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"12px 18px",marginBottom:16,color:"#fca5a5",fontSize:"0.84rem"}}>❌ {error}</div>}

            {/* Job Config */}
            <div style={card}>
              <div style={{padding:"16px 22px",borderBottom:"1px solid #1e2d42",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(0,229,255,0.1)",border:"1px solid rgba(0,229,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</div>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.93rem"}}>Job Profile Configuration</div>
                  <div style={{fontSize:"0.75rem",color:"#5a7a99"}}>Define the role for AI-powered matching</div>
                </div>
              </div>
              <div style={{padding:22}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  <div>
                    <label style={lbl}>Job Title</label>
                    <input style={inp} value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="e.g. Senior Data Scientist"/>
                  </div>
                  <div>
                    <label style={lbl}>Key Skills <span style={{color:"#5a7a99",textTransform:"none",fontSize:"0.6rem"}}>(comma-separated)</span></label>
                    <input style={inp} value={keySkills} onChange={e=>setKeySkills(e.target.value)} placeholder="Python, TensorFlow, Docker…"/>
                  </div>
                </div>
                <label style={lbl}>Job Description <span style={{color:"#5a7a99",textTransform:"none",fontSize:"0.6rem"}}>(min 50 chars)</span></label>
                <textarea style={{...inp,minHeight:140,resize:"vertical"}} value={jobDesc} onChange={e=>setJobDesc(e.target.value)} placeholder="Paste the full job description here…"/>
              </div>
            </div>

            {/* Upload */}
            <div style={card}>
              <div style={{padding:"16px 22px",borderBottom:"1px solid #1e2d42",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>📄</div>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.93rem"}}>Upload Resumes</div>
                  <div style={{fontSize:"0.75rem",color:"#5a7a99"}}>PDF or TXT · Up to 20 files · Max 5MB each</div>
                </div>
              </div>
              <div style={{padding:22}}>
                {/* Drop zone */}
                <div
                  style={{border:`2px dashed ${dragOver?"rgba(0,229,255,0.55)":"#1e2d42"}`,borderRadius:14,padding:"38px 20px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(0,229,255,0.04)":"#131d2b",transition:"all 0.2s",position:"relative"}}
                  onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files);}}
                  onClick={()=>fileInputRef.current.click()}
                >
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt" style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
                  <div style={{fontSize:"2.6rem",marginBottom:10}}>📁</div>
                  <div style={{fontWeight:700,fontSize:"1.05rem",marginBottom:6}}>{dragOver?"Drop files here!":"Drag & drop resumes here"}</div>
                  <div style={{fontSize:"0.78rem",color:"#5a7a99",marginBottom:14}}>PDF and TXT supported · Max 5MB per file</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(0,229,255,0.08)",border:"1px solid rgba(0,229,255,0.25)",color:"#00e5ff",fontFamily:"monospace",fontSize:"0.7rem",padding:"7px 18px",borderRadius:100}}>
                    📂 Browse Files
                  </div>
                </div>

                {/* File chips */}
                {files.length>0 && (
                  <div style={{marginTop:16}}>
                    <div style={{fontFamily:"monospace",fontSize:"0.63rem",color:"#5a7a99",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>{files.length} file{files.length>1?"s":""} selected</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {files.map(f=>(
                        <div key={f.name} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,229,255,0.07)",border:"1px solid rgba(0,229,255,0.2)",borderRadius:100,padding:"5px 12px",fontFamily:"monospace",fontSize:"0.68rem",color:"#00e5ff"}}>
                          {f.name.toLowerCase().endsWith(".pdf")?"📕":"📄"} {f.name.length>26?f.name.slice(0,23)+"…":f.name}
                          <span style={{cursor:"pointer",opacity:0.6,marginLeft:2}} onClick={e=>{e.stopPropagation();removeFile(f.name);}}>✕</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Run button */}
                <button
                  disabled={files.length===0}
                  style={{width:"100%",background:files.length===0?"#131d2b":"linear-gradient(135deg,#00e5ff,#6366f1)",color:files.length===0?"#5a7a99":"#000",fontWeight:800,fontSize:"1rem",padding:"15px 32px",border:"none",borderRadius:12,cursor:files.length===0?"not-allowed":"pointer",marginTop:18,transition:"opacity 0.2s,transform 0.15s,box-shadow 0.2s",letterSpacing:"-0.3px"}}
                  onMouseEnter={e=>{if(files.length>0){e.currentTarget.style.opacity="0.9";e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 30px rgba(0,229,255,0.25)";}}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                  onClick={runAnalysis}
                >
                  🚀 Analyze & Rank {files.length>0?`${files.length} Candidate${files.length>1?"s":""}` :"Candidates"} with Claude AI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PROCESSING ──────────────────────────────────── */}
        {screen==="processing" && (
          <div style={{animation:"slideUp 0.4s ease"}}>
            <div style={card}>
              <div style={{padding:"16px 22px",borderBottom:"1px solid #1e2d42",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(0,229,255,0.1)",border:"1px solid rgba(0,229,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",animation:"spin 1.5s linear infinite"}}>⚙️</div>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.93rem"}}>Claude AI Analysis in Progress</div>
                  <div style={{fontSize:"0.75rem",color:"#5a7a99"}}>Extracting text · Running NLP · Scoring against job profile</div>
                </div>
              </div>
              <div style={{padding:22}}>
                <div style={{marginBottom:22}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontFamily:"monospace",fontSize:"0.7rem",color:"#00e5ff"}}>{progress.label}</span>
                    <span style={{fontFamily:"monospace",fontSize:"0.7rem",color:"#5a7a99"}}>{progress.current}/{progress.total}</span>
                  </div>
                  <div style={{height:8,background:"#1e2d42",borderRadius:100,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${progress.total?(progress.current/progress.total)*100:0}%`,background:"linear-gradient(90deg,#00e5ff,#6366f1)",borderRadius:100,transition:"width 0.5s ease"}}/>
                  </div>
                </div>
                {files.map(f => <FileRow key={f.name} name={f.name} status={fileStatuses[f.name]||"waiting"}/>)}
                <div style={{marginTop:18,padding:14,background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.12)",borderRadius:10,textAlign:"center",fontFamily:"monospace",fontSize:"0.67rem",color:"#5a7a99",letterSpacing:"0.09em"}}>
                  CLAUDE AI · TF-IDF · KEYWORD ANALYSIS · SKILL TAXONOMY · NLP SCORING
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS ─────────────────────────────────────── */}
        {screen==="results" && results.length>0 && (
          <div style={{animation:"slideUp 0.4s ease"}}>
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:22}}>
              {[{val:results.length,lbl:"Candidates"},{val:`${avg}%`,lbl:"Avg Score"},{val:strongRec,lbl:"Strongly Recommended"},{val:`${topScore}%`,lbl:"Top Score"}].map(({val,lbl})=>(
                <div key={lbl} style={{background:"#0e1520",border:"1px solid #1e2d42",borderRadius:12,padding:"17px 14px",textAlign:"center"}}>
                  <div style={{fontWeight:800,fontSize:"1.8rem",color:"#00e5ff",lineHeight:1,marginBottom:6}}>{val}</div>
                  <div style={{fontFamily:"monospace",fontSize:"0.59rem",letterSpacing:"0.08em",color:"#5a7a99",textTransform:"uppercase"}}>{lbl}</div>
                </div>
              ))}
            </div>

            {/* Header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
              <div style={{fontWeight:800,fontSize:"1.2rem",letterSpacing:"-0.5px"}}>
                Rankings — {jobTitle} <span style={{color:"#5a7a99",fontWeight:400,fontSize:"0.82rem"}}>({results.length} candidates)</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={btn2} onClick={downloadCSV}>📥 Download HR Report (CSV)</button>
                <button style={{...btn2,color:"#5a7a99"}} onClick={()=>{setScreen("upload");setResults([]);setFiles([]);}}>↩ New Analysis</button>
              </div>
            </div>

            {/* Grade dist */}
            {(()=>{const dist={};results.forEach(r=>{dist[r.grade]=(dist[r.grade]||0)+1;});return(
              <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
                {Object.entries(dist).map(([g,c])=>(
                  <div key={g} style={{background:`${gradeColor(g)}14`,border:`1px solid ${gradeColor(g)}35`,borderRadius:8,padding:"5px 14px",fontFamily:"monospace",fontSize:"0.7rem",color:gradeColor(g)}}>Grade {g}: {c}</div>
                ))}
              </div>
            );})()}

            {results.map((r,i)=><CandidateCard key={r.filename+i} r={r} index={i}/>)}
          </div>
        )}

      </div>
    </div>
  );
}
