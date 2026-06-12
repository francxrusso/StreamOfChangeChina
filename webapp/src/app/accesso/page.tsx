import Image from "next/image";
import { loginAdmin } from "../access-actions";

export default function AccessoPage() {
  const isConfigured = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <section className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6">
        <Image
          src="/brand/logo.png"
          alt="Stream of Change China"
          width={2388}
          height={550}
          priority
          className="h-14 w-auto"
        />
        <h1 className="mt-8 text-2xl font-semibold text-ink">Accesso riservato</h1>
        {isConfigured ? (
          <form action={loginAdmin} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-stone-500">Password</span>
              <input
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/15"
              />
            </label>
            <button type="submit" className="rounded-md bg-cinnabar px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Entra
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-stone-700">
            Imposta la variabile ambiente ADMIN_PASSWORD per attivare l'accesso riservato.
          </p>
        )}
      </div>
    </section>
  );
}
