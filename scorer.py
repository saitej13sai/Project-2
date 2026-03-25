"""
AI-Powered Resume Scoring Engine
Uses TF-IDF + keyword matching + section analysis
"""

import re
import math
import string
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# ─── Stop Words ───────────────────────────────────────────────────────────────
STOP_WORDS = set([
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "by","from","is","are","was","were","be","been","being","have","has","had",
    "do","does","did","will","would","could","should","may","might","shall",
    "i","you","he","she","it","we","they","me","him","her","us","them",
    "this","that","these","those","which","who","what","when","where","how",
    "not","no","nor","so","yet","both","either","neither","as","if","then",
    "than","too","very","can","just","also","each","every","all","any","few",
    "more","most","other","some","such","only","own","same","than","too",
])

# ─── Skill Taxonomy ───────────────────────────────────────────────────────────
SKILL_CATEGORIES = {
    "programming": [
        "python","java","javascript","typescript","c++","c#","go","rust","swift",
        "kotlin","ruby","php","scala","r","matlab","perl","bash","shell",
    ],
    "web": [
        "react","angular","vue","node","django","flask","fastapi","spring",
        "html","css","rest","graphql","webpack","next","nuxt","express",
    ],
    "data": [
        "sql","mysql","postgresql","mongodb","redis","elasticsearch","spark",
        "hadoop","kafka","airflow","dbt","snowflake","bigquery","pandas","numpy",
    ],
    "ml_ai": [
        "machine learning","deep learning","nlp","computer vision","tensorflow",
        "pytorch","keras","scikit-learn","sklearn","huggingface","transformers",
        "bert","gpt","llm","neural network","reinforcement learning",
    ],
    "cloud": [
        "aws","azure","gcp","docker","kubernetes","terraform","ci/cd","devops",
        "microservices","serverless","lambda","ec2","s3","git","github","gitlab",
    ],
    "soft": [
        "leadership","communication","teamwork","problem solving","agile","scrum",
        "project management","collaboration","mentoring","analytical",
    ],
}


# ─── Text Preprocessing ───────────────────────────────────────────────────────

def preprocess_text(text: str) -> str:
    """Clean and normalize text."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\d+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = [w for w in text.split() if w not in STOP_WORDS and len(w) > 2]
    return ' '.join(tokens)


def extract_keywords(text: str, top_n: int = 20) -> list:
    """Extract top keywords using TF-IDF on a single document."""
    cleaned = preprocess_text(text)
    words = cleaned.split()
    freq = Counter(words)
    total = len(words) or 1
    tf = {w: c / total for w, c in freq.items()}
    # Simple IDF approximation using word length as proxy
    idf = {w: math.log(1 + 1 / (len(w) / 10 + 0.1)) for w in tf}
    scores = {w: tf[w] * idf[w] for w in tf}
    return sorted(scores, key=scores.get, reverse=True)[:top_n]


def extract_sections(text: str) -> dict:
    """Identify resume sections."""
    section_headers = {
        "experience": r"(experience|work history|employment|career)",
        "education": r"(education|qualification|degree|academic)",
        "skills": r"(skills|technologies|competencies|expertise|tools)",
        "projects": r"(projects|portfolio|work samples)",
        "certifications": r"(certif|license|credential|award)",
        "summary": r"(summary|objective|profile|about)",
    }
    found = {}
    for section, pattern in section_headers.items():
        found[section] = bool(re.search(pattern, text, re.IGNORECASE))
    return found


def extract_years_experience(text: str) -> float:
    """Estimate years of experience from text."""
    patterns = [
        r'(\d+)\+?\s*years?\s*(?:of\s+)?experience',
        r'(\d+)\+?\s*yrs?\s*(?:of\s+)?exp',
        r'experience\s*(?:of\s+)?(\d+)\+?\s*years?',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return float(m.group(1))

    # Fallback: count date ranges like 2018-2023
    ranges = re.findall(r'(20\d\d|19\d\d)\s*[-–]\s*(20\d\d|19\d\d|present)', text, re.IGNORECASE)
    total = 0
    for start, end in ranges:
        end_year = 2024 if end.lower() == 'present' else int(end)
        total += max(0, end_year - int(start))
    return min(total, 30)


def detect_skills(text: str) -> dict:
    """Detect skills from taxonomy."""
    text_lower = text.lower()
    found = {}
    for category, skills in SKILL_CATEGORIES.items():
        detected = [s for s in skills if s in text_lower]
        found[category] = detected
    return found


def extract_education_level(text: str) -> int:
    """Return education score: PhD=4, Master=3, Bachelor=2, Associate=1, None=0."""
    text_l = text.lower()
    if any(w in text_l for w in ['phd', 'ph.d', 'doctorate', 'doctor of']):
        return 4
    if any(w in text_l for w in ['master', 'msc', 'm.sc', 'mba', 'm.b.a', 'meng']):
        return 3
    if any(w in text_l for w in ['bachelor', 'bsc', 'b.sc', 'b.e', 'b.tech', 'undergraduate', 'b.a']):
        return 2
    if any(w in text_l for w in ['associate', 'diploma', 'certificate']):
        return 1
    return 0


# ─── Main Scoring Engine ──────────────────────────────────────────────────────

class ResumeScorer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=500,
            ngram_range=(1, 2),
            stop_words='english',
            min_df=1,
        )

    def score_resume(self, resume_text: str, job_description: str, job_skills: list = None) -> dict:
        """Score a single resume against a job description."""

        # 1. TF-IDF Cosine Similarity (40%)
        docs = [job_description, resume_text]
        try:
            tfidf_matrix = self.vectorizer.fit_transform(docs)
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        except Exception:
            cosine_sim = 0.0

        # 2. Keyword Match Score (30%)
        jd_keywords = set(extract_keywords(job_description, top_n=30))
        resume_keywords = set(extract_keywords(resume_text, top_n=50))
        if jd_keywords:
            keyword_match = len(jd_keywords & resume_keywords) / len(jd_keywords)
        else:
            keyword_match = 0.0

        # 3. Skill Match Score (20%)
        jd_skills_detected = detect_skills(job_description)
        resume_skills_detected = detect_skills(resume_text)

        jd_all_skills = set(s for skills in jd_skills_detected.values() for s in skills)
        resume_all_skills = set(s for skills in resume_skills_detected.values() for s in skills)

        if job_skills:
            jd_all_skills.update([s.lower().strip() for s in job_skills])

        if jd_all_skills:
            skill_match = len(jd_all_skills & resume_all_skills) / len(jd_all_skills)
            matched_skills = list(jd_all_skills & resume_all_skills)
            missing_skills = list(jd_all_skills - resume_all_skills)
        else:
            skill_match = 0.5
            matched_skills = list(resume_all_skills)
            missing_skills = []

        # 4. Education Score (5%)
        edu_level = extract_education_level(resume_text)
        edu_score = edu_level / 4.0

        # 5. Experience Score (5%)
        years_exp = extract_years_experience(resume_text)
        exp_score = min(years_exp / 10.0, 1.0)

        # 6. Resume Completeness (bonus)
        sections = extract_sections(resume_text)
        completeness = sum(sections.values()) / len(sections)

        # ── Weighted Final Score ──
        final_score = (
            cosine_sim      * 0.40 +
            keyword_match   * 0.30 +
            skill_match     * 0.20 +
            edu_score       * 0.05 +
            exp_score       * 0.05
        )
        # Completeness bonus (up to 5%)
        final_score = min(1.0, final_score + completeness * 0.05)

        # Score breakdown (0-100)
        return {
            "total_score": round(final_score * 100, 2),
            "breakdown": {
                "tfidf_similarity": round(cosine_sim * 100, 2),
                "keyword_match": round(keyword_match * 100, 2),
                "skill_match": round(skill_match * 100, 2),
                "education_score": round(edu_score * 100, 2),
                "experience_score": round(exp_score * 100, 2),
                "completeness": round(completeness * 100, 2),
            },
            "matched_skills": matched_skills[:15],
            "missing_skills": missing_skills[:10],
            "years_experience": years_exp,
            "education_level": ["None", "Associate/Diploma", "Bachelor's", "Master's", "PhD"][edu_level],
            "sections_found": sections,
            "top_keywords": list(resume_keywords)[:12],
        }

    def rank_resumes(self, resumes: list, job_description: str, job_skills: list = None) -> list:
        """
        Score and rank multiple resumes.
        resumes: list of dicts with keys 'filename', 'text', 'size'
        """
        results = []
        for resume in resumes:
            score_data = self.score_resume(resume['text'], job_description, job_skills)
            results.append({
                "filename": resume['filename'],
                "file_size": resume.get('size', 0),
                **score_data,
            })

        # Sort by total score descending
        results.sort(key=lambda x: x['total_score'], reverse=True)

        # Assign ranks and percentile
        n = len(results)
        for i, r in enumerate(results):
            r['rank'] = i + 1
            r['percentile'] = round((n - i) / n * 100, 1)
            r['grade'] = _score_to_grade(r['total_score'])
            r['recommendation'] = _score_to_recommendation(r['total_score'])

        return results


def _score_to_grade(score: float) -> str:
    if score >= 85: return "A+"
    if score >= 75: return "A"
    if score >= 65: return "B+"
    if score >= 55: return "B"
    if score >= 45: return "C"
    return "D"


def _score_to_recommendation(score: float) -> str:
    if score >= 75: return "Strongly Recommended"
    if score >= 60: return "Recommended"
    if score >= 45: return "Consider"
    if score >= 30: return "Weak Match"
    return "Not Recommended"
