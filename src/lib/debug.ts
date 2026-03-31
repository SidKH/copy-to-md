type LogLevel = "debug" | "warn" | "error";

type DevLogEntry = {
  context: {
    href: string | null;
    runtime: "extension" | "page" | "unknown";
  };
  details?: unknown;
  level: LogLevel;
  message: string;
  scope: string;
  timestamp: string;
};

type DevLogger = {
  debug(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
};

type CreateDevLoggerOptions = {
  enabled?: boolean;
  fetchImpl?: typeof fetch;
  sinkEndpoint?: string | null;
};

export const DEV_LOG_SINK_URL = "http://127.0.0.1:47321/log";

export function createDevLogger(
  scope: string,
  options?: CreateDevLoggerOptions,
): DevLogger {
  const enabled = options?.enabled ?? import.meta.env.DEV;
  const prefix = `[copy-to-md:${scope}]`;
  const sinkEndpoint =
    enabled && import.meta.env.DEV
      ? options?.sinkEndpoint ?? DEV_LOG_SINK_URL
      : null;
  const fetchImpl =
    options?.fetchImpl ?? (typeof fetch === "function" ? fetch.bind(globalThis) : undefined);

  function log(level: LogLevel, message: string, details?: unknown): void {
    if (!enabled) {
      return;
    }

    const consoleMethod = console[level];

    if (details === undefined) {
      consoleMethod(prefix, message);
    } else {
      consoleMethod(`${prefix} ${message}`, details);
    }

    if (!sinkEndpoint || !fetchImpl) {
      return;
    }

    const entry: DevLogEntry = {
      context: getDebugContext(),
      details: serializeDetails(details),
      level,
      message,
      scope,
      timestamp: new Date().toISOString(),
    };

    void fetchImpl(sinkEndpoint, {
      body: JSON.stringify(entry),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }).catch(() => {
      // Keep debug logging non-blocking and avoid noisy secondary errors.
    });
  }

  return {
    debug(message, details) {
      log("debug", message, details);
    },
    warn(message, details) {
      log("warn", message, details);
    },
    error(message, details) {
      log("error", message, details);
    },
  };
}

function getDebugContext(): DevLogEntry["context"] {
  const href = getLocationHref();

  if (href?.startsWith("chrome-extension://")) {
    return {
      href,
      runtime: "extension",
    };
  }

  if (href) {
    return {
      href,
      runtime: "page",
    };
  }

  return {
    href: null,
    runtime: "unknown",
  };
}

function getLocationHref(): string | null {
  const locationLike = globalThis.location;

  return typeof locationLike?.href === "string" ? locationLike.href : null;
}

function serializeDetails(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  const seen = new WeakSet<object>();

  return JSON.parse(
    JSON.stringify(value, (_key, nestedValue) => {
      if (nestedValue instanceof Error) {
        return {
          message: nestedValue.message,
          name: nestedValue.name,
          stack: nestedValue.stack,
        };
      }

      if (typeof nestedValue === "function") {
        return `[function ${nestedValue.name || "anonymous"}]`;
      }

      if (
        typeof nestedValue === "object" &&
        nestedValue !== null
      ) {
        if (seen.has(nestedValue)) {
          return "[circular]";
        }

        seen.add(nestedValue);
      }

      return nestedValue;
    }),
  );
}
