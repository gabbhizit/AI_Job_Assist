// Canonical skill name → all known variants (lowercase)
const SKILL_ALIASES: Record<string, string[]> = {
  // Programming Languages
  "python": ["python", "python3"],
  "javascript": ["javascript", "js", "ecmascript", "es6", "es2015"],
  "typescript": ["typescript", "ts"],
  "java": ["java"],
  "c++": ["c++", "cpp", "cplusplus", "c plus plus"],
  "c#": ["c#", "csharp", "c-sharp"],
  "c": ["\\bc\\b"],
  "go": ["golang", "go lang"],
  "rust": ["rust"],
  "ruby": ["ruby"],
  "php": ["php"],
  "swift": ["swift"],
  "kotlin": ["kotlin"],
  "scala": ["scala"],
  "r": ["\\br\\b"],
  "matlab": ["matlab"],
  "perl": ["perl"],
  "lua": ["lua"],
  "dart": ["dart"],
  "elixir": ["elixir"],
  "haskell": ["haskell"],
  "sql": ["sql"],
  "html": ["html", "html5"],
  "css": ["css", "css3"],
  "sass": ["sass", "scss"],
  "shell": ["shell", "bash", "zsh", "shell scripting"],

  // Frontend Frameworks
  "react": ["react", "reactjs", "react.js"],
  "next.js": ["next.js", "nextjs", "next"],
  "vue": ["vue", "vuejs", "vue.js"],
  "angular": ["angular", "angularjs"],
  "svelte": ["svelte", "sveltekit"],
  "remix": ["remix"],
  "gatsby": ["gatsby"],
  "tailwind css": ["tailwind", "tailwindcss", "tailwind css"],
  "bootstrap": ["bootstrap"],
  "material ui": ["material ui", "material-ui", "mui"],
  "redux": ["redux"],
  "jquery": ["jquery"],

  // Backend Frameworks
  "node.js": ["node", "nodejs", "node.js"],
  "express": ["express", "expressjs", "express.js"],
  "django": ["django"],
  "flask": ["flask"],
  "fastapi": ["fastapi", "fast api"],
  "spring boot": ["spring boot", "spring", "springboot"],
  "ruby on rails": ["ruby on rails", "rails", "ror"],
  "laravel": ["laravel"],
  "asp.net": ["asp.net", "aspnet", ".net", "dotnet"],
  "nestjs": ["nestjs", "nest.js"],
  "fastify": ["fastify"],
  "gin": ["gin"],
  "fiber": ["fiber"],

  // Databases
  "postgresql": ["postgresql", "postgres", "psql"],
  "mysql": ["mysql"],
  "mongodb": ["mongodb", "mongo"],
  "redis": ["redis"],
  "sqlite": ["sqlite"],
  "dynamodb": ["dynamodb", "dynamo db"],
  "cassandra": ["cassandra"],
  "elasticsearch": ["elasticsearch", "elastic search", "elastic"],
  "neo4j": ["neo4j"],
  "supabase": ["supabase"],
  "firebase": ["firebase", "firestore"],
  "oracle db": ["oracle", "oracle db"],
  "microsoft sql server": ["sql server", "mssql", "microsoft sql server"],
  "cockroachdb": ["cockroachdb"],
  "planetscale": ["planetscale"],
  "prisma": ["prisma"],

  // Cloud & Infrastructure
  "aws": ["aws", "amazon web services"],
  "google cloud": ["gcp", "google cloud", "google cloud platform"],
  "azure": ["azure", "microsoft azure"],
  "docker": ["docker"],
  "kubernetes": ["kubernetes", "k8s"],
  "terraform": ["terraform"],
  "ansible": ["ansible"],
  "jenkins": ["jenkins"],
  "github actions": ["github actions"],
  "gitlab ci": ["gitlab ci", "gitlab ci/cd"],
  "circleci": ["circleci", "circle ci"],
  "vercel": ["vercel"],
  "heroku": ["heroku"],
  "nginx": ["nginx"],
  "apache": ["apache"],
  "cloudflare": ["cloudflare"],
  "datadog": ["datadog"],
  "grafana": ["grafana"],
  "prometheus": ["prometheus"],
  "new relic": ["new relic", "newrelic"],

  // DevOps & Tools
  "git": ["git"],
  "github": ["github"],
  "gitlab": ["gitlab"],
  "bitbucket": ["bitbucket"],
  "jira": ["jira"],
  "confluence": ["confluence"],
  "linux": ["linux"],
  "ci/cd": ["ci/cd", "ci cd", "cicd", "continuous integration", "continuous deployment"],

  // Data & ML
  "machine learning": ["machine learning", "ml"],
  "deep learning": ["deep learning", "dl"],
  "natural language processing": ["natural language processing", "nlp"],
  "computer vision": ["computer vision", "cv"],
  "tensorflow": ["tensorflow", "tf"],
  "pytorch": ["pytorch"],
  "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
  "pandas": ["pandas"],
  "numpy": ["numpy"],
  "spark": ["spark", "apache spark", "pyspark"],
  "hadoop": ["hadoop"],
  "kafka": ["kafka", "apache kafka"],
  "airflow": ["airflow", "apache airflow"],
  "dbt": ["dbt"],
  "snowflake": ["snowflake"],
  "bigquery": ["bigquery", "big query"],
  "tableau": ["tableau"],
  "power bi": ["power bi", "powerbi"],
  "hugging face": ["hugging face", "huggingface"],
  "langchain": ["langchain"],
  "openai": ["openai"],
  "llm": ["llm", "large language model", "large language models"],
  "rag": ["rag", "retrieval augmented generation"],
  "generative ai": ["generative ai", "gen ai", "genai"],

  // Mobile
  "react native": ["react native"],
  "flutter": ["flutter"],
  "ios": ["ios"],
  "android": ["android"],

  // Testing
  "jest": ["jest"],
  "cypress": ["cypress"],
  "playwright": ["playwright"],
  "selenium": ["selenium"],
  "pytest": ["pytest"],
  "junit": ["junit"],
  "mocha": ["mocha"],

  // APIs & Protocols
  "rest api": ["rest", "rest api", "restful", "restful api"],
  "graphql": ["graphql"],
  "grpc": ["grpc"],
  "websocket": ["websocket", "websockets"],
  "rabbitmq": ["rabbitmq"],

  // Other
  "microservices": ["microservices", "micro services"],
  "system design": ["system design"],
  "data structures": ["data structures"],
  "algorithms": ["algorithms"],
  "agile": ["agile", "scrum"],
  "oauth": ["oauth", "oauth2", "oauth 2.0"],
  "blockchain": ["blockchain"],
  "web3": ["web3"],
  "figma": ["figma"],
};

// Pre-compile regex patterns for performance
const COMPILED_PATTERNS: { canonical: string; patterns: RegExp[] }[] = [];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Initialize compiled patterns
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  const patterns = aliases.map((alias) => {
    // If the alias already contains \b (for single-letter matches like C, R), use it directly
    if (alias.includes("\\b")) {
      return new RegExp(alias, "i");
    }
    return new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
  });
  COMPILED_PATTERNS.push({ canonical, patterns });
}

/**
 * Extract skills from text using the skills dictionary.
 * Returns an array of canonical skill names.
 */
export function extractSkills(text: string): string[] {
  const found: string[] = [];
  for (const { canonical, patterns } of COMPILED_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) {
      found.push(canonical);
    }
  }
  return found;
}

/**
 * Normalize a list of skill strings to their canonical forms.
 * Skills not in the dictionary are kept as-is (lowercased).
 */
export function normalizeSkills(skills: string[]): string[] {
  const normalized = new Set<string>();
  for (const skill of skills) {
    let matched = false;
    for (const { canonical, patterns } of COMPILED_PATTERNS) {
      if (patterns.some((pattern) => pattern.test(skill))) {
        normalized.add(canonical);
        matched = true;
        break;
      }
    }
    if (!matched) {
      normalized.add(skill.toLowerCase().trim());
    }
  }
  return [...normalized];
}
