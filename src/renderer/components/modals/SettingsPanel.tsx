import { useState, useEffect } from 'react';
import { X, Settings, Sun, Moon, Monitor, Server, Clock, Cloud, Palette, Key, FolderOpen } from 'lucide-react';
import { useAppStore, useToastStore } from '../../store/appStore';
import { getAPI } from '../../types/electron';
import type { AppSettings, SSHKeyInfo } from '@shared/types';
import { applyThemeClass } from '../../hooks/useAppEffects';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, loadAll } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [syncStatus, setSyncStatus] = useState<{ running: boolean; port: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sshKeys, setSshKeys] = useState<SSHKeyInfo[]>([]);

  useEffect(() => {
    getAPI()
      .sshKeysList()
      .then(({ keys, activePath }) => {
        setSshKeys(keys);
        if (activePath && !form.sshKeyPath) {
          setForm((prev) => ({ ...prev, sshKeyPath: activePath }));
        }
      })
      .catch(() => {});
  }, []);

  const handleClose = () => {
    applyThemeClass(settings.theme);
    onClose();
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'theme') {
      applyThemeClass(value as AppSettings['theme']);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await getAPI().saveSettings(form);
      await loadAll();
      addToast('设置已保存', 'success');
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const refreshSyncStatus = async () => {
    const status = await getAPI().syncStatus();
    setSyncStatus(status);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-[440px] max-h-[85vh] bg-dock-panel border border-dock-border rounded-xl shadow-2xl flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-dock-accent" />
            <h3 className="text-sm font-medium text-dock-text">设置</h3>
          </div>
          <button onClick={handleClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <Section title="外观" icon={<Palette className="w-3.5 h-3.5" />}>
            <div className="flex gap-2">
              {([
                ['dark', Moon, '深色'],
                ['light', Sun, '浅色'],
                ['system', Monitor, '跟随系统'],
              ] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  onClick={() => update('theme', value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-colors ${
                    form.theme === value
                      ? 'border-dock-accent bg-dock-accent/10 text-dock-accent'
                      : 'border-dock-border text-dock-muted hover:bg-dock-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="SSH" icon={<Server className="w-3.5 h-3.5" />}>
            <label className="flex items-center gap-2 text-xs text-dock-text cursor-pointer">
              <input
                type="checkbox"
                checked={form.useBuiltInTerminal}
                onChange={(e) => update('useBuiltInTerminal', e.target.checked)}
                className="accent-dock-accent"
              />
              使用内置终端 (xterm.js)
            </label>
            <div className="flex gap-2 mt-2">
              <Field label="默认用户" value={form.sshDefaultUser} onChange={(v) => update('sshDefaultUser', v)} />
              <Field label="默认端口" value={String(form.sshDefaultPort)} onChange={(v) => update('sshDefaultPort', parseInt(v, 10) || 22)} />
            </div>

            <div className="mt-3 pt-3 border-t border-dock-border">
              <div className="flex items-center gap-1.5 text-[10px] text-dock-muted mb-2 uppercase tracking-wider">
                <Key className="w-3.5 h-3.5" />
                SSH 密钥
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {sshKeys.length === 0 ? (
                  <p className="text-[11px] text-dock-muted">未找到 ~/.ssh 密钥</p>
                ) : (
                  sshKeys.map((key) => (
                    <label
                      key={key.path}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                        form.sshKeyPath === key.path
                          ? 'border-dock-accent bg-dock-accent/10'
                          : 'border-dock-border hover:bg-dock-hover'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sshKey"
                        checked={form.sshKeyPath === key.path}
                        onChange={() => update('sshKeyPath', key.path)}
                        className="mt-0.5 accent-dock-accent"
                      />
                      <div className="min-w-0">
                        <div className="text-dock-text font-medium">{key.name}</div>
                        <div className="text-[10px] text-dock-muted truncate">{key.path}</div>
                        {key.fingerprint && (
                          <div className="text-[10px] text-dock-muted font-mono truncate">{key.fingerprint}</div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await getAPI().sshKeyBrowse();
                  if (res.success && res.path) {
                    update('sshKeyPath', res.path);
                    addToast('已选择自定义密钥', 'success');
                  }
                }}
                className="mt-2 flex items-center gap-1.5 w-full py-1.5 text-xs border border-dock-border rounded-lg text-dock-muted hover:bg-dock-hover"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                浏览其他密钥文件...
              </button>

              <PassphraseSettings form={form} onUpdate={update} />
            </div>
          </Section>

          <Section title="窗口安全" icon={<Palette className="w-3.5 h-3.5" />}>
            <label className="flex items-center gap-2 text-xs text-dock-text cursor-pointer">
              <input
                type="checkbox"
                checked={form.windowBorderEnabled}
                onChange={(e) => update('windowBorderEnabled', e.target.checked)}
                className="accent-dock-accent"
              />
              环境窗口染色（生产=红框，测试=绿框）
            </label>
          </Section>

          <Section title="自动快照" icon={<Clock className="w-3.5 h-3.5" />}>
            <label className="flex items-center gap-2 text-xs text-dock-text cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoSnapshotEnabled}
                onChange={(e) => update('autoSnapshotEnabled', e.target.checked)}
                className="accent-dock-accent"
              />
              启用定时自动保存快照
            </label>
            <Field
              label="间隔（分钟）"
              value={String(form.autoSnapshotIntervalMinutes)}
              onChange={(v) => update('autoSnapshotIntervalMinutes', parseInt(v, 10) || 60)}
            />
          </Section>

          <Section title="团队同步" icon={<Cloud className="w-3.5 h-3.5" />}>
            <Field
              label="远程服务器 URL"
              value={form.syncServerUrl}
              onChange={(v) => update('syncServerUrl', v)}
              placeholder="http://192.168.1.100:9876"
            />
            <label className="flex items-center gap-2 text-xs text-dock-text cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={form.syncLocalServerEnabled}
                onChange={(e) => update('syncLocalServerEnabled', e.target.checked)}
                className="accent-dock-accent"
              />
              启用本地同步服务（供团队拉取）
            </label>
            <Field
              label="本地服务端口"
              value={String(form.syncServerPort)}
              onChange={(v) => update('syncServerPort', parseInt(v, 10) || 9876)}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={async () => {
                  try {
                    if (form.syncServerUrl) {
                      await getAPI().syncPull(form.syncServerUrl);
                      await loadAll();
                      addToast('已从远程拉取书签', 'success');
                    }
                  } catch (e) {
                    addToast(e instanceof Error ? e.message : '拉取失败', 'error');
                  }
                }}
                className="flex-1 py-1.5 text-xs border border-dock-border rounded-lg text-dock-text hover:bg-dock-hover"
              >
                拉取书签
              </button>
              <button
                onClick={async () => {
                  try {
                    if (form.syncServerUrl) {
                      await getAPI().syncPush(form.syncServerUrl);
                      addToast('已推送到远程', 'success');
                    }
                  } catch (e) {
                    addToast(e instanceof Error ? e.message : '推送失败', 'error');
                  }
                }}
                className="flex-1 py-1.5 text-xs border border-dock-border rounded-lg text-dock-text hover:bg-dock-hover"
              >
                推送书签
              </button>
              <button
                onClick={refreshSyncStatus}
                className="px-2 py-1.5 text-xs border border-dock-border rounded-lg text-dock-muted hover:bg-dock-hover"
              >
                状态
              </button>
            </div>
            {syncStatus && (
              <p className="text-[10px] text-dock-muted mt-1">
                本地服务: {syncStatus.running ? `运行中 :${syncStatus.port}` : '未运行'}
              </p>
            )}
          </Section>
        </div>

        <div className="flex gap-2 p-4 border-t border-dock-border shrink-0">
          <button onClick={handleClose} className="flex-1 py-2 text-sm text-dock-muted border border-dock-border rounded-lg">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm bg-dock-accent text-white rounded-lg disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-dock-muted mb-2 uppercase tracking-wider">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-1.5">
      <label className="text-[10px] text-dock-muted mb-0.5 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-xs bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
      />
    </div>
  );
}

function PassphraseSettings({
  form,
  onUpdate,
}: {
  form: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [passphrase, setPassphrase] = useState('');
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [hasStored, setHasStored] = useState(false);

  useEffect(() => {
    getAPI()
      .sshKeyNeedsPassphrase(form.sshKeyPath)
      .then(setNeedsPassphrase);
    getAPI()
      .sshHasPassphrase()
      .then(setHasStored);
  }, [form.sshKeyPath]);

  if (!needsPassphrase && !hasStored) return null;

  return (
    <div className="mt-3 pt-3 border-t border-dock-border space-y-2">
      <div className="text-[10px] text-dock-muted uppercase tracking-wider">密钥密码短语</div>
      {needsPassphrase && (
        <p className="text-[11px] text-dock-warning">当前密钥已加密，需输入密码短语才能连接</p>
      )}
      <input
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        placeholder="输入密码短语"
        className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
      />
      <label className="flex items-center gap-2 text-xs text-dock-text cursor-pointer">
        <input
          type="checkbox"
          checked={!!form.sshRememberPassphrase}
          onChange={(e) => onUpdate('sshRememberPassphrase', e.target.checked)}
          className="accent-dock-accent"
        />
        记住密码短语（系统密钥链加密）
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!passphrase}
          onClick={async () => {
            await getAPI().sshSetPassphrase(passphrase, form.sshRememberPassphrase);
            setHasStored(true);
            setPassphrase('');
            addToast('密码短语已保存', 'success');
          }}
          className="flex-1 py-1.5 text-xs bg-dock-accent text-white rounded-lg disabled:opacity-50"
        >
          保存短语
        </button>
        {hasStored && (
          <button
            type="button"
            onClick={async () => {
              await getAPI().sshClearPassphrase();
              setHasStored(false);
              addToast('已清除密码短语', 'success');
            }}
            className="px-3 py-1.5 text-xs border border-dock-border rounded-lg text-dock-muted"
          >
            清除
          </button>
        )}
      </div>
    </div>
  );
}
