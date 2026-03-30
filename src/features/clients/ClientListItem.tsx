import { MessageCircle, PenSquare, RouteIcon, ScanSearch, SquareCheckBig } from 'lucide-react';
import { useAppContext } from '@/app/state/AppContext';
import { clientSignals } from '@/shared/lib/analytics';
import { commercialProfileForClient } from '@/shared/lib/commercial';
import { routeDepartureInfo } from '@/shared/lib/routes';
import { formatCurrency } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import type { Client } from '@/shared/types/domain';

interface ClientListItemProps {
  client: Client;
  compact?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onCreateTask?: () => void;
}

export function ClientListItem({
  client,
  compact = false,
  selected = false,
  onSelectChange,
  onCreateTask
}: ClientListItemProps) {
  const { snapshot, selectedYear, selectedMonth, openClient, openWhatsApp } = useAppContext();
  const profile = commercialProfileForClient(
    client,
    snapshot.settings.commercialBrackets,
    selectedYear,
    selectedMonth,
    snapshot.settings.timezone
  );
  const signals = clientSignals(client, snapshot, selectedYear, selectedMonth);
  const routeDates = routeDepartureInfo(snapshot.routeDates, client.route?.id);
  const defaultTemplate =
    snapshot.settings.whatsappTemplates.find((template) => template.id === 'progress') ??
    snapshot.settings.whatsappTemplates[0];

  return (
    <Card className={selected ? 'border-[var(--accent-400)] shadow-[0_24px_90px_rgba(249,115,22,0.12)]' : ''}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {onSelectChange ? (
                <label className="inline-flex items-center gap-2 rounded-full bg-[var(--panel-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => onSelectChange(event.target.checked)}
                    className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent-600)]"
                  />
                  Selecionar
                </label>
              ) : null}
              <button
                type="button"
                className="text-left text-lg font-bold text-[var(--ink-900)] transition hover:text-[var(--accent-600)]"
                onClick={() => openClient(client.id)}
              >
                {client.nome || 'Cliente sem nome'}
              </button>
            </div>
            <p className="text-sm text-[var(--ink-600)]">
              {client.codigo} • {client.cidade || 'Sem cidade'} / {client.uf || '--'}
            </p>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {client.route?.name ?? 'Sem rota'} {routeDates?.departure ? `• saida ${routeDates.departure}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={profile.missingToNext > 0 ? 'info' : 'success'}>{profile.currentBracket.label}</Badge>
            <Badge tone={client.priority === 'urgente' ? 'danger' : client.priority === 'alta' ? 'warning' : 'neutral'}>
              {client.priority}
            </Badge>
            <Badge tone="info">{client.stage}</Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Mes comercial</p>
            <p className="mt-1 text-base font-semibold text-[var(--ink-900)]">{profile.contextLabel}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Acumulado</p>
            <p className="mt-1 text-base font-semibold text-[var(--ink-900)]">{formatCurrency(profile.revenue)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Falta</p>
            <p className="mt-1 text-base font-semibold text-[var(--ink-900)]">
              {profile.nextBracket ? formatCurrency(profile.missingToNext) : 'Faixa maxima'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {signals.length > 0 ? (
            signals.map((signal) => (
              <Badge key={signal.id} tone={signal.tone}>
                {signal.label}
              </Badge>
            ))
          ) : (
            <Badge tone="success">Sem alertas</Badge>
          )}
          {(client.tags ?? []).slice(0, compact ? 2 : 4).map((tag) => (
            <Badge key={tag} tone="neutral">
              #{tag}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => openClient(client.id)}>
            <ScanSearch className="mr-2 h-4 w-4" />
            Abrir 360
          </Button>
          <Button variant="secondary" onClick={() => openClient(client.id)}>
            <PenSquare className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="secondary" onClick={() => defaultTemplate && void openWhatsApp(client.id, defaultTemplate)}>
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          {onCreateTask ? (
            <Button variant="ghost" onClick={onCreateTask}>
              <SquareCheckBig className="mr-2 h-4 w-4" />
              Criar tarefa
            </Button>
          ) : null}
          {!compact ? (
            <Button variant="ghost" onClick={() => openClient(client.id)}>
              <RouteIcon className="mr-2 h-4 w-4" />
              Ir para rota
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

