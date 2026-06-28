import { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { getAPI } from '../../types/electron';
import { useAppStore, useToastStore } from '../../store/appStore';

export function PassphrasePromptModal() {
  const { passphrasePrompt, clearPassphrasePrompt } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [passphrase, setPassphrase] = useState('');
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!passphrasePrompt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;
    setSaving(true);
    try {
      await getAPI().sshSetPassphrase(passphrase, remember);
      clearPassphrasePrompt();
      setPassphrase('');
      await passphrasePrompt.retry();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => clearPassphrasePrompt()} />
      <div className="relative w-[360px] bg-dock-panel border border-dock-border rounded-xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-dock-accent" />
            <h3 className="text-sm font-medium text-dock-text">SSH 密钥密码短语</h3>
          </div>
          <button
            onClick={() => clearPassphrasePrompt()}
            className="p-1 text-dock-muted hover:text-dock-text rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-xs text-dock-muted">
            当前 SSH 私钥已加密，请输入密码短语以继续连接。
          </p>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
            placeholder="密码短语"
            autoFocus
          />
          <label className="flex items-center gap-2 text-xs text-dock-text cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-dock-accent"
            />
            记住密码短语（系统密钥链加密存储）
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => clearPassphrasePrompt()}
              className="flex-1 py-2 text-sm border border-dock-border rounded-lg text-dock-muted"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !passphrase}
              className="flex-1 py-2 text-sm bg-dock-accent text-white rounded-lg disabled:opacity-50"
            >
              确认
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
