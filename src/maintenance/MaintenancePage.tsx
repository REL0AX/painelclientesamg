export function MaintenancePage() {
  return (
    <main className="page-shell overflow-hidden px-6 py-10 text-[var(--ink-900)]">
      <div className="glass-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[36px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-600)]">
              Painel Clientes AMG
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
              Painel em manutencao temporaria
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--ink-700)] md:text-lg">
              O dominio continua online, mas o acesso operacional ao painel foi suspenso por enquanto para evitar uso
              desnecessario durante esta pausa. Quando a operacao voltar, o mesmo endereco sera reativado.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-500)]">Status</p>
                <p className="mt-3 text-lg font-semibold">Manutencao preventiva</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-600)]">
                  A interface principal foi retirada do ar temporariamente.
                </p>
              </article>

              <article className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-500)]">Acesso</p>
                <p className="mt-3 text-lg font-semibold">Temporariamente bloqueado</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-600)]">
                  Login, painel e sincronizacao ficam pausados ate a reabertura.
                </p>
              </article>

              <article className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-500)]">Dados</p>
                <p className="mt-3 text-lg font-semibold">Preservados</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-600)]">
                  Esta pausa nao apaga o projeto nem os dados ja existentes.
                </p>
              </article>
            </div>
          </div>

          <aside className="rounded-[36px] border border-[var(--line)] bg-[var(--panel-subtle)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ink-500)]">Enquanto isso</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                <p className="text-sm font-semibold text-[var(--ink-900)]">Sem consumo operacional</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-600)]">
                  A pagina de manutencao nao carrega o painel, nao sobe sincronizacao e nao abre a parte operacional.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                <p className="text-sm font-semibold text-[var(--ink-900)]">Mesmo dominio</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-600)]">
                  O link publicado continua ativo para indicar a pausa e evitar erro de pagina fora do ar.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                <p className="text-sm font-semibold text-[var(--ink-900)]">Reativacao simples</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-600)]">
                  Quando quiser voltar, basta restaurar o boot principal do app e publicar de novo.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-dashed border-[var(--line)] px-5 py-4 text-sm leading-6 text-[var(--ink-700)]">
              Nenhuma acao adicional e necessaria agora. O site permanece online apenas como aviso de manutencao.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
