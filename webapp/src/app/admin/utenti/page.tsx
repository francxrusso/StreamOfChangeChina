import Link from "next/link";
import { UserPlus, UsersRound } from "lucide-react";
import { requireEditSession } from "@/app/access-actions";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { createUser, updateUser } from "./actions";

export const dynamic = "force-dynamic";

type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  can_edit: boolean;
  created_at: string;
  last_login_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Mai";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function getUsers() {
  await requireEditSession();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id,email,display_name,is_active,can_edit,created_at,last_login_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminUser[];
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-cinnabar hover:text-ink">
            Torna al database
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-ink">Utenti e permessi</h1>
          <p className="mt-3 max-w-3xl text-stone-700">
            Crea gli accessi al corpus e decidi chi puo' modificare i dati. Gli utenti senza permesso modifica possono solo consultare.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
          <span className="font-semibold text-ink">{users.length}</span> utenti configurati
        </div>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-100 text-cinnabar">
            <UserPlus size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-ink">Nuovo utente</h2>
            <p className="mt-1 text-sm text-stone-600">La password non viene mai mostrata dopo il salvataggio.</p>
          </div>
        </div>
        <form action={createUser} className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-xs font-semibold uppercase text-stone-500">Nome</span>
            <input name="display_name" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cinnabar" />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase text-stone-500">Email</span>
            <input name="email" type="email" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cinnabar" />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase text-stone-500">Password</span>
            <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cinnabar" />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-stone-700">
            <input name="can_edit" type="checkbox" className="h-4 w-4 rounded border-stone-300 text-cinnabar" />
            Puo' modificare dati e utenti
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Crea utente
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-100 text-jade">
            <UsersRound size={20} aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold text-ink">Utenti esistenti</h2>
        </div>
        {users.map((user) => (
          <details key={user.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{user.display_name}</p>
                  <p className="mt-1 text-sm text-stone-600">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                  <span className="rounded-sm bg-stone-100 px-2 py-1">{user.is_active ? "attivo" : "disattivato"}</span>
                  <span className="rounded-sm bg-stone-100 px-2 py-1">{user.can_edit ? "modifica" : "sola lettura"}</span>
                  <span className="rounded-sm bg-stone-100 px-2 py-1">ultimo accesso: {formatDate(user.last_login_at)}</span>
                </div>
              </div>
            </summary>
            <form action={updateUser} className="mt-5 grid gap-4 border-t border-stone-100 pt-5 md:grid-cols-2">
              <input type="hidden" name="id" value={user.id} />
              <label>
                <span className="text-xs font-semibold uppercase text-stone-500">Nome</span>
                <input name="display_name" defaultValue={user.display_name} required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cinnabar" />
              </label>
              <label>
                <span className="text-xs font-semibold uppercase text-stone-500">Email</span>
                <input name="email" type="email" defaultValue={user.email} required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cinnabar" />
              </label>
              <label>
                <span className="text-xs font-semibold uppercase text-stone-500">Nuova password</span>
                <input name="password" type="password" minLength={8} placeholder="Lascia vuoto per non cambiarla" className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cinnabar" />
              </label>
              <div className="flex flex-wrap items-end gap-5 pb-2 text-sm text-stone-700">
                <label className="flex items-center gap-2">
                  <input name="is_active" type="checkbox" defaultChecked={user.is_active} className="h-4 w-4 rounded border-stone-300 text-cinnabar" />
                  Attivo
                </label>
                <label className="flex items-center gap-2">
                  <input name="can_edit" type="checkbox" defaultChecked={user.can_edit} className="h-4 w-4 rounded border-stone-300 text-cinnabar" />
                  Puo' modificare
                </label>
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-cinnabar">
                  Salva utente
                </button>
              </div>
            </form>
          </details>
        ))}
      </section>
    </section>
  );
}
