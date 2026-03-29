import { MessageCircle, PenSquare, RouteIcon, ScanSearch } from 'lucide-react';
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
}

export function ClientListItem({ client, compact = false }: ClientListItemProps) {
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
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <button
            type="button"
            className="text-left text-lg font-bold text-[var(--ink-900)] transition hover:text-[var(--accent-600)]"
            onClick={() => openClient(client.id)}
          >
            {client.nome || 'Cliente sem nome'}
          </button>
          <p className="text-sm text-[var(--ink-600)]">
            {client.codigo} • {client.cidade || 'Sem cidade'} / {client.uf || '--'}
          </p>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {client.route?.name ?? 'Sem rota'} {routeDates?.departure ? `• saida ${routeDates.departure}` : ''}
          </p>
        </div>
        <Badge tone={profile.missingToNext > 0 ? 'info' : 'success'}>{profile.currentBracket.label}</Badge>
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
        <Button variant="secondary" onClick={() => openWhatsApp(client.id, defaultTemplate)}>
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </Button>
        {!compact ? (
          <Button variant="ghost" onClick={() => openClient(client.id)}>
            <RouteIcon className="mr-2 h-4 w-4" />
            Ir para rota
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
