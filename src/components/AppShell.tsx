import { cn } from "@/lib/cn";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Admin sayfaları masaüstünde biraz daha geniş */
  variant?: "catalog" | "admin" | "narrow";
};

export function AppShell({
  children,
  className,
  variant = "catalog",
}: AppShellProps) {
  return (
    <div
      className={cn(
        "app-viewport",
        variant === "catalog" && "app-viewport--catalog"
      )}
    >
      <main
        className={cn(
          "app-main mx-auto min-h-screen w-full",
          variant === "catalog" && "app-main--catalog",
          variant === "admin" && "app-main--admin",
          variant === "narrow" && "app-main--narrow",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
