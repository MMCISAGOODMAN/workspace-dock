import 'xterm/css/xterm.css';
import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Plus } from 'lucide-react';
import type { TerminalSessionInfo } from '@shared/types';
import { ENV_BORDER_COLORS } from '@shared/types';

interface TerminalAPI {
  write: (sessionId: string, data: string) => Promise<void>;
  resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
  close: (sessionId: string) => Promise<void>;
  list: () => Promise<TerminalSessionInfo[]>;
  setActive: (sessionId: string) => Promise<void>;
  newWindow: () => Promise<string>;
  onData: (cb: (sessionId: string, data: string) => void) => () => void;
  onExit: (cb: (sessionId: string) => void) => () => void;
  onSessionsChanged: (cb: (sessions: TerminalSessionInfo[]) => void) => () => void;
}

declare global {
  interface Window {
    terminalAPI: TerminalAPI;
  }
}

function XTermPane({ sessionId }: { sessionId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;

    term.onData((data) => {
      window.terminalAPI.write(sessionId, data);
    });

    const ro = new ResizeObserver(() => {
      fitAddon.fit();
      window.terminalAPI.resize(sessionId, term.cols, term.rows);
    });
    ro.observe(containerRef.current);

    const unsubData = window.terminalAPI.onData((id, data) => {
      if (id === sessionId) term.write(data);
    });
    const unsubExit = window.terminalAPI.onExit((id) => {
      if (id === sessionId) term.write('\r\n\x1b[33m[会话已断开]\x1b[0m\r\n');
    });

    return () => {
      unsubData();
      unsubExit();
      ro.disconnect();
      term.dispose();
    };
  }, [sessionId]);

  return <div ref={containerRef} className="h-full w-full p-1" />;
}

export default function TerminalApp() {
  const [sessions, setSessions] = useState<TerminalSessionInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    window.terminalAPI.list().then((list) => {
      setSessions(list);
      if (list.length > 0) setActiveId(list[list.length - 1].sessionId);
    });
    const unsub = window.terminalAPI.onSessionsChanged((list) => {
      setSessions(list);
      setActiveId((prev) => {
        if (prev && list.some((s) => s.sessionId === prev)) return prev;
        return list.length > 0 ? list[list.length - 1].sessionId : null;
      });
    });
    return unsub;
  }, []);

  const active = sessions.find((s) => s.sessionId === activeId);

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-[#e6edf3]">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#161b22] border-b border-[#30363d] overflow-x-auto shrink-0">
        {sessions.map((s) => {
          const borderColor = s.environmentType
            ? ENV_BORDER_COLORS[s.environmentType]
            : '#30363d';
          return (
            <button
              key={s.sessionId}
              onClick={() => {
                setActiveId(s.sessionId);
                window.terminalAPI.setActive(s.sessionId);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-t transition-colors shrink-0"
              style={{
                backgroundColor: activeId === s.sessionId ? '#0d1117' : 'transparent',
                borderTop: `2px solid ${borderColor}`,
              }}
            >
              <span>{s.hostName}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.terminalAPI.close(s.sessionId);
                }}
                className="opacity-50 hover:opacity-100 ml-1"
              >
                ×
              </span>
            </button>
          );
        })}
        {sessions.length === 0 && (
          <span className="text-xs text-[#8b949e] px-2">等待 SSH 连接...</span>
        )}
        <button
          onClick={() => window.terminalAPI.newWindow()}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded shrink-0"
          title="新建终端窗口"
        >
          <Plus className="w-3.5 h-3.5" />
          新窗口
        </button>
      </div>

      {active && (
        <div className="px-3 py-1 text-[11px] text-[#8b949e] border-b border-[#30363d] shrink-0">
          {active.username}@{active.ip}:{active.port}
          {active.path && ` · ${active.path}`}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {active ? (
          <XTermPane key={active.sessionId} sessionId={active.sessionId} />
        ) : (
          <div className="h-full flex items-center justify-center text-[#8b949e] text-sm">
            从 Dock 面板点击主机发起连接
          </div>
        )}
      </div>
    </div>
  );
}
