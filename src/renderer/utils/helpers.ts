export function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const terms = query.toLowerCase().trim().split(/\s+/);
  return terms.every((term) => t.includes(term));
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/);
  let result = text;
  for (const term of terms) {
    if (!term) continue;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '<mark class="highlight">$1</mark>');
  }
  return result;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export function formatCountdown(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return '已过期';
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildSSHCommand(
  ip: string,
  port: number,
  username: string,
  path?: string,
): string {
  const portFlag = port !== 22 ? ` -p ${port}` : '';
  const base = `ssh${portFlag} ${username}@${ip}`;
  if (path) return `${base} -t 'cd ${path} && exec $SHELL -l'`;
  return base;
}

export function parseIPFromText(text: string): string | null {
  const ipMatch = text.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
  return ipMatch ? ipMatch[1] : null;
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
