import Link from "next/link";
import { createAdminRecord, deleteAdminRecord, updateAdminRecord } from "./actions";
import { adminResources, getAdminResource, type AdminField, type AdminResource } from "./admin-config";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
}>;

type Row = Record<string, string | number | null>;

type RelationOption = {
  id: string;
  label: string;
};

type RelationOptions = Record<NonNullable<AdminField["relation"]>, RelationOption[]>;

function asDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Non impostato";
  }

  const stringValue = String(value);
  return stringValue.length > 90 ? `${stringValue.slice(0, 90)}...` : stringValue;
}

function inputType(field: AdminField) {
  if (field.type === "datetime") {
    return "datetime-local";
  }

  if (field.type === "decimal") {
    return "number";
  }

  if (field.type === "uuid") {
    return "text";
  }

  return field.type;
}

function fieldDefaultValue(field: AdminField, value: Row[string] | undefined) {
  if (value === null || value === undefined) {
    if (field.name === "visibility") {
      return "private";
    }

    if (field.name === "stagione") {
      return "1";
    }

    return "";
  }

  if (field.type === "datetime") {
    return String(value).slice(0, 16);
  }

  return String(value);
}

function FieldControl({
  field,
  value,
  relationOptions
}: {
  field: AdminField;
  value?: Row[string];
  relationOptions: RelationOptions;
}) {
  const defaultValue = fieldDefaultValue(field, value);
  const baseClass =
    "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/15";

  if (field.relation) {
    return (
      <select name={field.name} defaultValue={defaultValue} required={field.required} className={baseClass}>
        <option value="">Seleziona</option>
        {relationOptions[field.relation].map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "select") {
    return (
      <select name={field.name} defaultValue={defaultValue} required={field.required} className={baseClass}>
        <option value="">Seleziona</option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        name={field.name}
        defaultValue={defaultValue}
        required={field.required}
        rows={field.name === "trascrizione" ? 8 : 4}
        className={baseClass}
      />
    );
  }

  return (
    <input
      name={field.name}
      type={inputType(field)}
      step={field.type === "decimal" ? "0.001" : undefined}
      defaultValue={defaultValue}
      required={field.required}
      className={baseClass}
    />
  );
}

function AdminForm({
  resource,
  relationOptions,
  row,
  mode
}: {
  resource: AdminResource;
  relationOptions: RelationOptions;
  row?: Row;
  mode: "create" | "update";
}) {
  const action = mode === "create" ? createAdminRecord : updateAdminRecord;

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="resource" value={resource.key} />
      {mode === "update" &&
        resource.primaryKey.map((key) => <input key={key} type="hidden" name={`pk_${key}`} value={String(row?.[key] ?? "")} />)}
      <div className="grid gap-4 md:grid-cols-2">
        {resource.fields.map((field) => (
          <label key={field.name} className={field.type === "textarea" ? "md:col-span-2" : undefined}>
            <span className="text-xs font-semibold uppercase text-stone-500">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            <FieldControl field={field} value={row?.[field.name]} relationOptions={relationOptions} />
          </label>
        ))}
      </div>
      <div>
        <button
          type="submit"
          className="rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          {mode === "create" ? "Aggiungi" : "Salva modifiche"}
        </button>
      </div>
    </form>
  );
}

function DeleteForm({ resource, row }: { resource: AdminResource; row: Row }) {
  return (
    <form action={deleteAdminRecord}>
      <input type="hidden" name="resource" value={resource.key} />
      {resource.primaryKey.map((key) => (
        <input key={key} type="hidden" name={`pk_${key}`} value={String(row[key] ?? "")} />
      ))}
      <button type="submit" className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
        Elimina
      </button>
    </form>
  );
}

function ResourceTabs({ activeKey }: { activeKey: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {adminResources.map((resource) => {
        const isActive = resource.key === activeKey;

        return (
          <Link
            key={resource.key}
            href={`/admin?tab=${resource.key}`}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              isActive
                ? "border-cinnabar bg-cinnabar text-white"
                : "border-stone-200 bg-white text-stone-700 hover:border-cinnabar hover:text-cinnabar"
            }`}
          >
            {resource.label}
          </Link>
        );
      })}
    </div>
  );
}

async function getRelationOptions(): Promise<RelationOptions> {
  const supabase = createSupabaseAdminClient();
  const [serie, episodi, personaggi, emozioni, danmuAnalizzati, danmuRaw] = await Promise.all([
    supabase.from("serie_tv").select("id, titolo_originale").order("titolo_originale"),
    supabase.from("episodi").select("id, serie_id, stagione, numero_episodio, titolo_originale").order("created_at", { ascending: false }).limit(500),
    supabase.from("personaggi").select("id, nome_originale").order("nome_originale").limit(500),
    supabase.from("emozioni").select("id, nome").order("nome"),
    supabase.from("danmu_analizzati").select("id, danmu_raw_id").order("created_at", { ascending: false }).limit(500),
    supabase.from("danmu_raw").select("id, testo_originale").order("created_at", { ascending: false }).limit(500)
  ]);

  return {
    serie: (serie.data ?? []).map((row) => ({ id: row.id, label: row.titolo_originale })),
    episodi: (episodi.data ?? []).map((row) => ({
      id: row.id,
      label: `S${row.stagione} E${row.numero_episodio}${row.titolo_originale ? ` - ${row.titolo_originale}` : ""}`
    })),
    personaggi: (personaggi.data ?? []).map((row) => ({ id: row.id, label: row.nome_originale })),
    emozioni: (emozioni.data ?? []).map((row) => ({ id: row.id, label: row.nome })),
    danmuAnalizzati: (danmuAnalizzati.data ?? []).map((row) => ({ id: row.id, label: row.danmu_raw_id })),
    danmuRaw: (danmuRaw.data ?? []).map((row) => ({ id: row.id, label: asDisplayValue(row.testo_originale) }))
  };
}

async function getRows(resource: AdminResource) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(resource.table).select("*").limit(50);

  if (resource.orderBy) {
    query = query.order(resource.orderBy, { ascending: resource.orderBy !== "created_at" });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Row[];
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const activeResource = getAdminResource(params.tab);
  const [rows, relationOptions] = await Promise.all([getRows(activeResource), getRelationOptions()]);

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-cinnabar">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Gestione database</h1>
        <p className="mt-3 max-w-3xl text-stone-700">
          Aggiungi, modifica e cancella i dati editoriali del progetto. Le modifiche salvate qui vanno direttamente su Supabase.
        </p>
      </div>

      <ResourceTabs activeKey={activeResource.key} />

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">Aggiungi {activeResource.label.toLowerCase()}</h2>
            <p className="mt-1 text-sm text-stone-600">I campi con asterisco sono obbligatori.</p>
          </div>
        </div>
        <AdminForm resource={activeResource} relationOptions={relationOptions} mode="create" />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">{activeResource.label}</h2>
            <p className="mt-1 text-sm text-stone-600">Ultimi {rows.length} record disponibili per questa tabella.</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">Nessun record presente.</div>
        ) : (
          rows.map((row) => (
            <details key={activeResource.primaryKey.map((key) => row[key]).join(":")} className="rounded-lg border border-stone-200 bg-white p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center gap-2">
                  {activeResource.summaryFields.map((field) => (
                    <span key={field} className="rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-700">
                      {asDisplayValue(row[field])}
                    </span>
                  ))}
                </div>
              </summary>
              <div className="mt-5 border-t border-stone-100 pt-5">
                <AdminForm resource={activeResource} relationOptions={relationOptions} row={row} mode="update" />
                <div className="mt-4">
                  <DeleteForm resource={activeResource} row={row} />
                </div>
              </div>
            </details>
          ))
        )}
      </section>
    </section>
  );
}
