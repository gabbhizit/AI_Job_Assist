export const RESUME_PARSE_PROMPT = `You are an expert resume parser for computer science and software engineering resumes. Extract structured data from the following resume text.

IMPORTANT RULES:
- Return ONLY valid JSON. No text before or after.
- If a field is not found, use null for optional fields or empty arrays for lists.
- For skills, categorize them correctly into languages, frameworks, databases, tools, and other.
- For dates, use "YYYY-MM" format when possible. Use "present" for current roles.
- Infer total_years_experience from work experience dates. Round to 1 decimal.
- Infer target_roles_inferred: suggest 2-3 likely job titles based on experience and skills.
- For highest_degree, map to: "bachelors", "masters", "phd", or "other".
- Extract technologies mentioned in experience descriptions into the technologies array.

Return this exact JSON schema:
{
  "name": "string",
  "email": "string or null",
  "phone": "string or null",
  "linkedin": "string or null",
  "summary": "string or null (professional summary if present)",
  "skills": {
    "languages": ["programming languages like Python, Java, TypeScript"],
    "frameworks": ["frameworks like React, Django, Spring Boot"],
    "databases": ["databases like PostgreSQL, MongoDB, Redis"],
    "tools": ["tools like Docker, AWS, Git, Kubernetes"],
    "other": ["other skills like Machine Learning, System Design"]
  },
  "skills_flat": ["all unique skills combined into one flat array"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "location": "string or null",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or present or null",
      "is_current": false,
      "description": "full description text",
      "technologies": ["tech mentioned in this role"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string (e.g. Master of Science)",
      "field": "string (e.g. Computer Science)",
      "gpa": "string or null",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null",
      "is_current": false,
      "coursework": ["relevant courses"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["tech used"],
      "url": "string or null"
    }
  ],
  "certifications": ["list of certifications"],
  "total_years_experience": 0.0,
  "highest_degree": "masters",
  "target_roles_inferred": ["Software Engineer", "Backend Developer"]
}

Resume text:
---
{RESUME_TEXT}
---`;
