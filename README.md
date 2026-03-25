# 🎯 TalentRank AI — Resume Intelligence Platform

> AI-powered resume ranking system using NLP, TF-IDF, and cosine similarity scoring.

---

## 📐 Architecture Overview

```
resume-ranker/
├── app.py                   # Flask web server (routes, session, API)
├── scorer.py                # NLP scoring engine (TF-IDF + skill taxonomy)
├── extractor.py             # PDF/TXT text extraction
├── report_generator.py      # CSV HR report generation
├── requirements.txt
├── templates/
│   └── index.html           # Single-page frontend (HTML/CSS/JS)
├── sample_resumes/          # Sample TXT resumes for testing
│   ├── sarah_johnson_resume.txt
│   ├── michael_chen_resume.txt
│   └── priya_sharma_resume.txt
└── uploads/                 # Temporary file storage (auto-created)
```

---

## 🧠 Scoring Algorithm

Each resume is scored against the job description using a **weighted multi-factor model**:

| Factor | Weight | Method |
|---|---|---|
| TF-IDF Cosine Similarity | 40% | Vectorize JD + resume, measure semantic overlap |
| Keyword Match | 30% | Extract top-N JD keywords, count overlap in resume |
| Skill Match | 20% | Taxonomy-based skill detection across 6 categories |
| Education Level | 5% | Detect PhD > Master > Bachelor > Associate > None |
| Experience Years | 5% | Regex extraction of years + date range analysis |
| Resume Completeness | Bonus | Detect presence of key sections (Experience, Skills, etc.) |

### Grading Scale
| Score | Grade | Recommendation |
|---|---|---|
| 85–100% | A+ | Strongly Recommended |
| 75–84%  | A  | Strongly Recommended |
| 65–74%  | B+ | Recommended |
| 55–64%  | B  | Recommended |
| 45–54%  | C  | Consider |
| < 45%   | D  | Not Recommended |

### Skill Categories Detected
- **Programming**: Python, Java, JavaScript, Go, Rust, etc.
- **Web**: React, Django, Flask, Node, REST, GraphQL, etc.
- **Data**: SQL, MongoDB, Spark, Kafka, Airflow, BigQuery, etc.
- **ML/AI**: TensorFlow, PyTorch, BERT, LLM, NLP, Computer Vision, etc.
- **Cloud/DevOps**: AWS, Azure, GCP, Docker, Kubernetes, CI/CD, etc.
- **Soft Skills**: Leadership, Agile, Communication, etc.

---

## 🚀 Setup & Running

### 1. Install Dependencies
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm   # Optional: enhances preprocessing
```

### 2. Start the Server
```bash
python app.py
```
Open: **http://localhost:5000**

---

## 🖥️ How to Use

1. **Enter Job Title** (e.g. "Senior Data Scientist")
2. **Paste Job Description** (full JD text, min 50 chars)
3. **Add Key Skills** (comma-separated for boosted matching)
4. **Upload Resumes** (PDF or TXT, drag-and-drop, max 20 files)
5. **Click Analyze** → View ranked results in seconds
6. **Download HR Report** → Get a full CSV with all scores

---

## 📊 API Endpoints

| Method | Route | Description |
|---|---|---|
| GET  | `/` | Serve the web UI |
| POST | `/api/rank` | Score and rank uploaded resumes |
| GET  | `/api/download-report` | Download CSV report of last ranking |
| GET  | `/api/health` | Health check |

### POST `/api/rank` — Form Data Parameters
| Field | Type | Required | Description |
|---|---|---|---|
| `job_title` | string | No | Job title label |
| `job_description` | string | Yes | Full job description (min 50 chars) |
| `job_skills` | string | No | Comma-separated skills to boost |
| `resumes` | files | Yes | PDF or TXT resume files |

### Response Format
```json
{
  "success": true,
  "processed_count": 5,
  "job_title": "Senior ML Engineer",
  "results": [
    {
      "rank": 1,
      "filename": "sarah_johnson.pdf",
      "candidate_name": "Sarah Johnson",
      "total_score": 87.4,
      "grade": "A+",
      "recommendation": "Strongly Recommended",
      "percentile": 100.0,
      "years_experience": 7,
      "education_level": "Master's",
      "matched_skills": ["python", "tensorflow", "docker", "aws", "sql"],
      "missing_skills": [],
      "breakdown": {
        "tfidf_similarity": 82.3,
        "keyword_match": 90.0,
        "skill_match": 95.0,
        "education_score": 75.0,
        "experience_score": 100.0,
        "completeness": 100.0
      },
      "contact": {
        "email": "sarah.johnson@email.com",
        "phone": "+1-555-0101",
        "linkedin": "linkedin.com/in/sarahjohnson"
      }
    }
  ],
  "stats": {
    "total_candidates": 5,
    "avg_score": 62.3,
    "max_score": 87.4,
    "min_score": 28.1,
    "strongly_recommended": 1,
    "grade_distribution": { "A+": 1, "B": 2, "C": 1, "D": 1 }
  }
}
```

---

## 🔧 Extending the System

### Add spaCy for enhanced preprocessing
In `scorer.py`, replace `preprocess_text()`:
```python
import spacy
nlp = spacy.load("en_core_web_sm")

def preprocess_text(text):
    doc = nlp(text.lower())
    tokens = [t.lemma_ for t in doc if not t.is_stop and not t.is_punct and len(t.text) > 2]
    return ' '.join(tokens)
```

### Add Redis for multi-user session storage
```python
import redis, json
r = redis.Redis()
r.set(session_id, json.dumps(results), ex=3600)
```

### Add PDF generation for HR reports
```bash
pip install reportlab
```
Then create `pdf_report.py` using ReportLab to generate formatted PDF reports.

---

## ⚡ Production Deployment

```bash
# Use gunicorn instead of dev server
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# With Docker
docker build -t talentrank-ai .
docker run -p 5000:5000 talentrank-ai
```

---

## 📋 Sample Output (CSV Report)

```
AI Resume Ranking Report - Senior ML Engineer
Generated: 2025-01-15 14:23:01
Total Candidates: 3

Rank, Candidate File,        Grade, Total Score, TF-IDF, Keyword, Skill, Education, Experience, Recommendation
1,    sarah_johnson.txt,     A+,    87.4,         82.3,   90.0,    95.0,  75.0,      100.0,      Strongly Recommended
2,    michael_chen.txt,      B+,    66.1,         61.2,   68.0,    72.0,  50.0,      60.0,       Recommended
3,    priya_sharma.txt,      C,     48.3,         42.1,   50.0,    45.0,  50.0,      30.0,       Consider
```

---

## 📜 License
MIT — Free to use and extend.
