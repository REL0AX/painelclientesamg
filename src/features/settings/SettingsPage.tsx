import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAppContext } from '@/app/state/AppContext';
import { useBackups } from '@/features/settings/useBackups';
import { countPendingSyncChanges } from '@/shared/lib/sync-ledger';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FieldLabel, Input, Select, Textarea } from '@/shared/ui/Field';
import type { AppSnapshot, MonthlyCommercialBracket, WhatsAppTemplate } from '@/shared/types/domain';

export function SettingsPage() {
  const {
    snapshot,
    cloud,
    updateSettings,
    saveBackup,
    exportBackup,
    deleteBackup,
    restoreBackup,
    clearAllData,
    loginCloud,
    logoutCloud,
    syncNow
  } = useAppContext();
  const backups = useBackups();
  const [email, setEmail] = useState('admin@admin.com.br');
  const [password, setPassword] = useState('');
  const [brackets, setBrackets] = useState<MonthlyCommercialBracket[]>(snapshot.settings.commercialBrackets);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(snapshot.settings.whatsappTemplates);
  const [thresholds, setThresholds] = useState(snapshot.settings.thresholds);
  const [maxBackups, setMaxBackups] = useState(String(snapshot.settings.maxBackups));
  const [defaultImportMergePolicy, setDefaultImportMergePolicy] = useState(snapshot.settings.defaultImportMergePolicy);

  useEffect(() => {
    setBrackets(snapshot.settings.commercialBrackets);
    setTemplates(snapshot.settings.whatsappTemplates);
    setThresholds(snapshot.settings.thresholds);
    setMaxBackups(String(snapshot.settings.maxBackups));
    setDefaultImportMergePolicy(snapshot.settings.defaultImportMergePolicy);
  }, [
    snapshot.settings.commercialBrackets,
    snapshot.settings.whatsappTemplates,
    snapshot.settings.thresholds,
    snapshot.settings.maxBackups,
    snapshot.settings.defaultImportMergePolicy
  ]);

  const loginMutation = useMutation({
    mutationFn: async () => loginCloud(email, password)
  });

  const logoutMutation = useMutation({
    mutationFn: logoutCloud
  });

  const syncMutation = useMutation({
    mutationFn: syncNow
  });

  const handleBackupImport = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    const parsed = JSON.parse(content) as AppSnapshot;
    await restoreBackup(parsed, `restauracao manual de ${file.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Nuvem e seguranca</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Firebase e admins</h2>
            <p className="mt-2 text-sm text-[var(--ink-600)]">
              O bootstrap antigo foi removido. O acesso online agora depende apenas de `panelAdmins/&lt;uid&gt;`.
            </p>
          </div>

          <div className="rounded-[24px] bg-[var(--panel-subtle)] p-4">
            <p className="text-sm font-semibold text-[var(--ink-900)]">Status atual</p>
            <p className="mt-2 text-sm text-[var(--ink-600)]">{cloud.status}</p>
            {cloud.error ? <p className="mt-2 text-sm text-red-700">{cloud.error}</p> : null}
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">
              Pendencias locais: {countPendingSyncChanges(snapshot.meta.syncLedger)}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Senha</FieldLabel>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => loginMutation.mutate()} disabled={loginMutation.isPending}>
              Entrar no Firebase
            </Button>
            <Button variant="secondary" onClick={() => syncMutation.mutate(undefined)} disabled={syncMutation.isPending || cloud.permission !== 'admin'}>
              Sincronizar agora
            </Button>
            <Button variant="ghost" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending || !cloud.authUser}>
              Sair
            </Button>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Backups</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Seguranca local do painel</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Maximo de backups locais</FieldLabel>
              <Input value={maxBackups} onChange={(event) => setMaxBackups(event.target.value)} />
            </div>
            <div>
              <FieldLabel>Politica padrao de importacao</FieldLabel>
              <Select value={defaultImportMergePolicy} onChange={(event) => setDefaultImportMergePolicy(event.target.value as typeof defaultImportMergePolicy)}>
                <option value="merge">Mesclar</option>
                <option value="replace">Substituir</option>
                <option value="ignore">Ignorar</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void saveBackup('backup manual pela tela de configuracoes')}>
              Salvar backup
            </Button>
            <Button variant="secondary" onClick={exportBackup}>
              Exportar JSON
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink-900)]">
              Importar JSON
              <input type="file" accept=".json" className="hidden" onChange={(event) => void handleBackupImport(event.target.files?.[0])} />
            </label>
            <Button variant="danger" onClick={() => void clearAllData()}>
              Limpar painel
            </Button>
          </div>
          <div className="space-y-3">
            {backups.length > 0 ? (
              backups.map((backup) => (
                <div key={backup.id} className="rounded-[22px] border border-[var(--line)] bg-white p-4">
                  <p className="font-semibold text-[var(--ink-900)]">{backup.reason}</p>
                  <p className="mt-1 text-sm text-[var(--ink-600)]">{new Date(backup.createdAt).toLocaleString('pt-BR')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void restoreBackup(backup.snapshot, `restaurar backup ${backup.id}`)}>
                      Restaurar
                    </Button>
                    <Button variant="ghost" onClick={() => void deleteBackup(backup.id)}>
                      Excluir backup
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--ink-600)]">Nenhum backup salvo ainda.</p>
            )}
          </div>
          <div>
            <Button
              onClick={() =>
                void updateSettings({
                  maxBackups: Math.max(5, Number(maxBackups) || snapshot.settings.maxBackups),
                  defaultImportMergePolicy
                })
              }
            >
              Salvar preferencias operacionais
            </Button>
          </div>
        </Card>
      </div>

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Tabela comercial mensal</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Faixas para o proximo mes</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          {brackets.map((bracket, index) => (
            <div key={bracket.id} className="rounded-[24px] border border-[var(--line)] bg-white p-4">
              <FieldLabel>Nome</FieldLabel>
              <Input
                value={bracket.label}
                onChange={(event) =>
                  setBrackets((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? { ...item, label: event.target.value } : item))
                  )
                }
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Min</FieldLabel>
                  <Input
                    value={String(bracket.min)}
                    onChange={(event) =>
                      setBrackets((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, min: Number(event.target.value) || 0 } : item))
                      )
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Max</FieldLabel>
                  <Input
                    value={bracket.max === null ? '' : String(bracket.max)}
                    placeholder="vazio = sem teto"
                    onChange={(event) =>
                      setBrackets((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, max: event.target.value.trim() === '' ? null : Number(event.target.value) || 0 }
                            : item
                        )
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <Button onClick={() => void updateSettings({ commercialBrackets: brackets })}>Salvar tabela comercial</Button>
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Thresholds do painel</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Sinais automaticos</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <FieldLabel>Perto da proxima tabela (R$)</FieldLabel>
            <Input value={String(thresholds.nearNextTable)} onChange={(event) => setThresholds((current) => ({ ...current, nearNextTable: Number(event.target.value) || 0 }))} />
          </div>
          <div>
            <FieldLabel>Sem compra recente (dias)</FieldLabel>
            <Input value={String(thresholds.staleDays)} onChange={(event) => setThresholds((current) => ({ ...current, staleDays: Number(event.target.value) || 0 }))} />
          </div>
          <div>
            <FieldLabel>Cliente em risco (dias)</FieldLabel>
            <Input value={String(thresholds.atRiskDays)} onChange={(event) => setThresholds((current) => ({ ...current, atRiskDays: Number(event.target.value) || 0 }))} />
          </div>
          <div>
            <FieldLabel>Saida da rota proxima (dias)</FieldLabel>
            <Input value={String(thresholds.routeDepartureSoonDays)} onChange={(event) => setThresholds((current) => ({ ...current, routeDepartureSoonDays: Number(event.target.value) || 0 }))} />
          </div>
        </div>
        <div>
          <Button onClick={() => void updateSettings({ thresholds })}>Salvar thresholds</Button>
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">WhatsApp</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Templates configuraveis</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {templates.map((template, index) => (
            <div key={template.id} className="rounded-[24px] border border-[var(--line)] bg-white p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Nome</FieldLabel>
                  <Input
                    value={template.name}
                    onChange={(event) =>
                      setTemplates((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item))
                      )
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Categoria</FieldLabel>
                  <Select
                    value={template.category}
                    onChange={(event) =>
                      setTemplates((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, category: event.target.value as WhatsAppTemplate['category'] } : item
                        )
                      )
                    }
                  >
                    <option value="reativacao">Reativacao</option>
                    <option value="progresso">Progresso</option>
                    <option value="rota">Rota</option>
                    <option value="cobranca-leve">Cobranca leve</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="livre">Livre</option>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <FieldLabel>Descricao</FieldLabel>
                <Input
                  value={template.description}
                  onChange={(event) =>
                    setTemplates((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, description: event.target.value } : item))
                    )
                  }
                />
              </div>
              <div className="mt-3">
                <FieldLabel>Mensagem</FieldLabel>
                <Textarea
                  rows={5}
                  value={template.message}
                  onChange={(event) =>
                    setTemplates((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, message: event.target.value } : item))
                    )
                  }
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-[var(--ink-700)]">
                <input
                  type="checkbox"
                  checked={template.enabled}
                  onChange={(event) =>
                    setTemplates((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled: event.target.checked } : item))
                    )
                  }
                  className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent-600)]"
                />
                Template ativo
              </div>
            </div>
          ))}
        </div>
        <div>
          <Button onClick={() => void updateSettings({ whatsappTemplates: templates })}>Salvar templates</Button>
        </div>
      </Card>
    </div>
  );
}

