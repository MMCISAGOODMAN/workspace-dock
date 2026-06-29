export interface ClipboardHostSuggestion {
  host: string;
  port?: number;
  username?: string;
  /** 用于按钮展示的原始剪贴板片段 */
  raw: string;
}

/** 剪贴板捕获：始终保留原文，可选解析出主机信息 */
export interface ClipboardCapture {
  text: string;
  host: ClipboardHostSuggestion | null;
}

function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function isValidHostname(host: string): boolean {
  if (host.length < 1 || host.length > 253) return false;
  return /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host);
}

function suggestion(
  host: string,
  raw: string,
  port?: number,
  username?: string,
): ClipboardHostSuggestion | null {
  const cleaned = host.replace(/[.,;:!?)]+$/, '');
  if (!isValidIPv4(cleaned) && !isValidHostname(cleaned)) return null;
  return {
    host: cleaned,
    port: port && port > 0 && port <= 65535 ? port : undefined,
    username: username || undefined,
    raw,
  };
}

function firstMeaningfulLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? text.trim()
  );
}

/** 从剪贴板文本解析 IP / 主机名（运维场景） */
export function parseHostFromClipboard(text: string): ClipboardHostSuggestion | null {
  const line = firstMeaningfulLine(text);
  if (!line || line.length > 500) return null;

  // ssh [-options] [user@]host[:port]
  const sshMatch = line.match(
    /(?:^|\s)ssh\s+(?:-(?:[^\s]+\s+))*(?:([^\s@]+)@)?([^\s:]+)(?::(\d+))?/i,
  );
  if (sshMatch) {
    const parsed = suggestion(
      sshMatch[2],
      line,
      sshMatch[3] ? parseInt(sshMatch[3], 10) : undefined,
      sshMatch[1] || undefined,
    );
    if (parsed) return parsed;
  }

  // user@host[:port]
  const userHostMatch = line.match(/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9._:-]+?)(?::(\d+))?$/);
  if (userHostMatch) {
    const parsed = suggestion(
      userHostMatch[2],
      line,
      userHostMatch[3] ? parseInt(userHostMatch[3], 10) : undefined,
      userHostMatch[1],
    );
    if (parsed) return parsed;
  }

  // IPv4[:port]（整行）
  const ipPortMatch = line.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?$/);
  if (ipPortMatch && isValidIPv4(ipPortMatch[1])) {
    return suggestion(
      ipPortMatch[1],
      line,
      ipPortMatch[2] ? parseInt(ipPortMatch[2], 10) : undefined,
    );
  }

  // 日志行中的 IPv4（如 "error from 10.0.0.1: connection refused"）
  const ipMatch = line.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
  if (ipMatch && isValidIPv4(ipMatch[1])) {
    const portMatch = line.match(/\b(\d{1,3}(?:\.\d{1,3}){3}):(\d{2,5})\b/);
    return suggestion(
      ipMatch[1],
      line,
      portMatch ? parseInt(portMatch[2], 10) : undefined,
    );
  }

  // 纯主机名（单行、无空格）
  const token = line.split(/\s+/)[0]?.replace(/[.,;:!?)]+$/, '') ?? '';
  if (token && !token.includes(' ') && isValidHostname(token)) {
    return suggestion(token, line);
  }

  return null;
}

/** 解析任意剪贴板文本，供按钮展示 */
export function parseClipboardCapture(text: string): ClipboardCapture | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) return null;

  return {
    text: trimmed,
    host: parseHostFromClipboard(trimmed),
  };
}

export function formatClipboardHostLabel(item: ClipboardHostSuggestion): string {
  const hostPart = item.port ? `${item.host}:${item.port}` : item.host;
  return item.username ? `${item.username}@${hostPart}` : hostPart;
}

export function formatClipboardLabel(capture: ClipboardCapture): string {
  if (capture.host) return formatClipboardHostLabel(capture.host);
  const singleLine = capture.text.replace(/\s+/g, ' ').trim();
  return singleLine.length > 52 ? `${singleLine.slice(0, 52)}…` : singleLine;
}
