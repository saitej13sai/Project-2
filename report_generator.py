"""
HR Report Generator
Generates CSV reports from ranking results
"""

import csv
import io
import json
from datetime import datetime


def generate_csv_report(results: list, job_title: str = "Position") -> str:
    """Generate a detailed CSV report for HR."""
    output = io.StringIO()
    
    writer = csv.writer(output)
    
    # Header
    writer.writerow([f"AI Resume Ranking Report - {job_title}"])
    writer.writerow([f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
    writer.writerow([f"Total Candidates: {len(results)}"])
    writer.writerow([])
    
    # Column headers
    writer.writerow([
        "Rank",
        "Candidate File",
        "Grade",
        "Total Score (%)",
        "TF-IDF Similarity (%)",
        "Keyword Match (%)",
        "Skill Match (%)",
        "Education Score (%)",
        "Experience Score (%)",
        "Resume Completeness (%)",
        "Years Experience",
        "Education Level",
        "Matched Skills",
        "Missing Skills",
        "Recommendation",
        "Percentile",
        "Email",
        "Phone",
    ])
    
    # Data rows
    for r in results:
        bd = r.get('breakdown', {})
        writer.writerow([
            r.get('rank', ''),
            r.get('filename', ''),
            r.get('grade', ''),
            r.get('total_score', ''),
            bd.get('tfidf_similarity', ''),
            bd.get('keyword_match', ''),
            bd.get('skill_match', ''),
            bd.get('education_score', ''),
            bd.get('experience_score', ''),
            bd.get('completeness', ''),
            r.get('years_experience', ''),
            r.get('education_level', ''),
            ', '.join(r.get('matched_skills', [])),
            ', '.join(r.get('missing_skills', [])),
            r.get('recommendation', ''),
            r.get('percentile', ''),
            r.get('contact', {}).get('email', '') if r.get('contact') else '',
            r.get('contact', {}).get('phone', '') if r.get('contact') else '',
        ])
    
    writer.writerow([])
    writer.writerow(["--- Score Breakdown Legend ---"])
    writer.writerow(["TF-IDF Similarity (40%)", "Semantic similarity between resume and job description"])
    writer.writerow(["Keyword Match (30%)", "Overlap of important keywords"])
    writer.writerow(["Skill Match (20%)", "Technical skill alignment"])
    writer.writerow(["Education Score (5%)", "Highest education level detected"])
    writer.writerow(["Experience Score (5%)", "Years of experience detected"])
    
    return output.getvalue()


def generate_summary_stats(results: list) -> dict:
    """Generate summary statistics for the ranking."""
    if not results:
        return {}
    
    scores = [r['total_score'] for r in results]
    
    # Grade distribution
    grades = {}
    for r in results:
        g = r.get('grade', 'D')
        grades[g] = grades.get(g, 0) + 1
    
    # Recommendation distribution
    recs = {}
    for r in results:
        rec = r.get('recommendation', 'Not Recommended')
        recs[rec] = recs.get(rec, 0) + 1
    
    return {
        "total_candidates": len(results),
        "avg_score": round(sum(scores) / len(scores), 2),
        "max_score": max(scores),
        "min_score": min(scores),
        "top_candidate": results[0]['filename'] if results else None,
        "grade_distribution": grades,
        "recommendation_distribution": recs,
        "strongly_recommended": sum(1 for r in results if r.get('total_score', 0) >= 75),
    }
