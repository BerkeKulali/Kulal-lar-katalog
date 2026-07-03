import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
          Yükleniyor…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
