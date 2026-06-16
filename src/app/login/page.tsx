import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");
  const sp = await searchParams;
  // Il middleware NextAuth reindirizza con ?callbackUrl=...; supportiamo entrambi.
  const dest = sp.next ?? sp.callbackUrl ?? "/";

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const next = String(formData.get("next") ?? "/");
    try {
      await signIn("credentials", { email, password, redirectTo: next });
    } catch (e: any) {
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
      redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Navaltecnica</h1>
          <p className="text-sm text-muted-foreground">Gestionale Service</p>
        </div>
        {sp.error && (
          <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Credenziali non valide
          </p>
        )}
        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={dest} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">Accedi</Button>
        </form>
      </div>
    </div>
  );
}
