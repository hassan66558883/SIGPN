function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`[env] ${name} is not set (see .env.example).`);
  return v;
}
function optional(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}
function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get appName() {
    return optional("APP_NAME", "Police Management System");
  },
  get appUrl() {
    return optional("APP_URL", "http://localhost:3300").replace(/\/+$/, "");
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get dataEncryptionKey() {
    return required("DATA_ENCRYPTION_KEY");
  },
  get trustProxy() {
    return optional("TRUST_PROXY", "0") === "1";
  },
  session: {
    get idleMinutes() {
      return int("SESSION_IDLE_MINUTES", 60);
    },
    get absoluteHours() {
      return int("SESSION_ABSOLUTE_HOURS", 10);
    },
  },
  login: {
    get maxFailures() {
      return int("LOGIN_MAX_FAILURES", 5);
    },
    get lockMinutes() {
      return int("LOGIN_LOCK_MINUTES", 15);
    },
  },
  password: {
    get minLength() {
      return int("PASSWORD_MIN_LENGTH", 12);
    },
    get maxAgeDays() {
      return int("PASSWORD_MAX_AGE_DAYS", 90);
    },
    historySize: 5,
  },
  upload: {
    get dir() {
      return optional("UPLOAD_DIR", "./uploads");
    },
    get maxBytes() {
      return int("UPLOAD_MAX_MB", 25) * 1024 * 1024;
    },
  },
  get backupDir() {
    return optional("BACKUP_DIR", "./backups");
  },
  stt: {
    get provider() {
      return optional("STT_PROVIDER", "simulated");
    },
    get apiKey() {
      return optional("STT_API_KEY");
    },
  },
  get demoPassword() {
    return optional("DEMO_PASSWORD", "Demo-Pms-2026!");
  },
};
