import { useMemo, useState } from 'react';
import { MessageCircleMore, ScanSearch, SendHorizontal } from 'lucide-react';
import { useAppContext } from '@/app/state/AppContext';
import { worklistsForSnapshot } from '@/shared/lib/analytics';
import { commercialProfileForClient } from '@/shared/lib/commercial';
import { downloadWorkbook } from '@/shared/lib/export';
import { routeDepartureInfo } from '@/shared/lib/routes';
import { normalizeClientPhone, renderWhatsAppMessage } from '@/shared/lib/whatsapp';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FieldLabel, Input, Select, Textarea } from '@/shared/ui/Field';
import { formatCurrency } from '@/shared/lib/utils';

export function CampaignsPage() {
  const { snapshot, selectedYear, selectedMonth, openClient, openWhatsApp } = useAppContext();
  const [worklistId, setWorklistId] = useState('sem-compra-recente');
  const [templateId, setTemplateId] = useState(
    snapshot.settings.whatsappTemplates.find((template) => template.enabled)?.id ??
      snapshot.settings.whatsappTemplates[0]?.id ??
      ''
  );
  const [manualFilter, setManualFilter] = useState('');
  const [freeformAppendix, setFreeformAppendix] = useState('');

  const worklists = useMemo(
    () => worklistsForSnapshot(snapshot, selectedYear, selectedMonth),
    [selectedMonth, selectedYear, snapshot]
  );
  const selectedWorklist = worklists.find((item) => item.id === worklistId) ?? worklists[0];
  const selectedTemplate =
    snapshot.settings.whatsappTemplates.find((template) => template.id === templateId) ??
    snapshot.settings.whatsappTemplates[0];

  const queue = useMemo(() => {
    const normalized = manualFilter.trim().toLowerCase();
    return (selectedWorklist?.clients ?? []).filter((client) => {
      if (!normalized) {
        return true;
      }

      return (
        client.nome.toLowerCase().includes(normalized) ||
        client.codigo.toLowerCase().includes(normalized) ||
        client.cidade.toLowerCase().includes(normalized)
      );
    });
  }, [manualFilter, selectedWorklist?.clients]);

  const nextValidClient = queue.find((client) => normalizeClientPhone(client).isValid);

  const exportCampaignWorkbook = () => {
    if (!selectedWorklist || queue.length === 0) {
      return;
    }

    downloadWorkbook(
      [
        {
          name: 'Fila',
          rows: queue.map((client) => {
            const profile = commercialProfileForClient(
              client,
              snapshot.settings.commercialBrackets,
              selectedYear,
              selectedMonth,
              snapshot.settings.timezone
            );
            const phone = normalizeClientPhone(client);
            return {
              cliente: client.nome,
              codigo: client.codigo,
              cidade: client.cidade,
              telefone: phone.international,
              worklist: selectedWorklist.title,
              template: selectedTemplate?.name || '',
              faturamento_mes: formatCurrency(profile.revenue),
              tabela_atual: profile.currentBracket.label,
              proxima_tabela: profile.nextBracket?.label || 'Faixa maxima',
              falta_para_proxima: formatCurrency(profile.missingToNext)
            };
          })
        }
      ],
      `campanha-${selectedWorklist.id}-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const runtimeTemplate = selectedTemplate
    ? {
        ...selectedTemplate,
        message: freeformAppendix.trim()
          ? `${selectedTemplate.message}\n\n${freeformAppendix.trim()}`
          : selectedTemplate.message
      }
    : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Campanhas manuais</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">WhatsApp cliente a cliente, sem custo</h2>
          <p className="mt-2 text-sm text-[var(--ink-600)]">
            O painel monta a fila, prepara o texto e abre o WhatsApp via `wa.me` sem API paga nem disparo em massa.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Segmento</FieldLabel>
            <Select value={worklistId} onChange={(event) => setWorklistId(event.target.value)}>
              {worklists.map((worklist) => (
                <option key={worklist.id} value={worklist.id}>
                  {worklist.title} ({worklist.clients.length})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Template</FieldLabel>
            <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              {snapshot.settings.whatsappTemplates
                .filter((template) => template.enabled)
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <div>
            <FieldLabel>Refino manual</FieldLabel>
            <Input
              value={manualFilter}
              onChange={(event) => setManualFilter(event.target.value)}
              placeholder="Nome, codigo ou cidade"
            />
          </div>
          <div className="pt-6">
            <Button variant="secondary" onClick={exportCampaignWorkbook}>
              Exportar XLSX
            </Button>
          </div>
          <div className="pt-6">
            <Button
              onClick={() => nextValidClient && runtimeTemplate && void openWhatsApp(nextValidClient.id, runtimeTemplate)}
              disabled={!nextValidClient || !runtimeTemplate}
            >
              <SendHorizontal className="mr-2 h-4 w-4" />
              Abrir proximo
            </Button>
          </div>
        </div>

        <div>
          <FieldLabel>Anexo livre da campanha</FieldLabel>
          <Textarea
            rows={4}
            value={freeformAppendix}
            onChange={(event) => setFreeformAppendix(event.target.value)}
            placeholder="Observacao opcional para ser somada ao template no momento da leitura."
          />
        </div>

        <div className="rounded-[24px] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--ink-700)]">
          <p className="font-semibold text-[var(--ink-900)]">{selectedWorklist?.title || 'Sem segmento'}</p>
          <p className="mt-1">{selectedWorklist?.description || 'Selecione uma worklist para montar a fila.'}</p>
          <p className="mt-3">
            {queue.length} clientes nesta fila, sendo {queue.filter((client) => normalizeClientPhone(client).isValid).length} com telefone valido.
          </p>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Fila de disparo manual</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Preview por cliente</h2>
        </div>

        {runtimeTemplate && queue.length > 0 ? (
          queue.map((client) => {
            const profile = commercialProfileForClient(
              client,
              snapshot.settings.commercialBrackets,
              selectedYear,
              selectedMonth,
              snapshot.settings.timezone
            );
            const routeDates = routeDepartureInfo(snapshot.routeDates, client.route?.id);
            const phone = normalizeClientPhone(client);
            const preview = renderWhatsAppMessage(runtimeTemplate, client, profile, routeDates);

            return (
              <div key={client.id} className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--ink-900)]">{client.nome || client.codigo}</p>
                    <p className="mt-1 text-sm text-[var(--ink-600)]">
                      {client.codigo} • {client.cidade || 'Sem cidade'} / {client.uf || '--'} • {client.route?.name || 'Sem rota'}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">
                      {profile.currentBracket.label} • falta {formatCurrency(profile.missingToNext)} para {profile.nextBracket?.label || 'faixa maxima'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${phone.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                    {phone.isValid ? phone.international : 'sem telefone'}
                  </span>
                </div>

                <div className="mt-4 rounded-[22px] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--ink-700)] whitespace-pre-wrap">
                  {preview}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openClient(client.id)}>
                    <ScanSearch className="mr-2 h-4 w-4" />
                    Abrir cliente
                  </Button>
                  <Button onClick={() => void openWhatsApp(client.id, runtimeTemplate)} disabled={!phone.isValid}>
                    <MessageCircleMore className="mr-2 h-4 w-4" />
                    Abrir WhatsApp
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState title="Fila vazia" description="Escolha uma worklist e um template para montar a campanha manual." />
        )}
      </Card>
    </div>
  );
}
