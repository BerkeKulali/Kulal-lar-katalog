"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ADMIN_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  type AdminPermission,
} from "@/lib/admin-permissions";
import type { AdminRole } from "@/generated/prisma/client";

type Brand = { id: string; name: string; slug: string };

function togglePermission(
  list: AdminPermission[],
  setList: (next: AdminPermission[]) => void,
  perm: AdminPermission
) {
  setList(
    list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm]
  );
}

/**
 * Modül seviyesinde tanımlı: daha önce ana component'ın içinde tanımlıydı ve
 * her render'da yeni bir component tipi ürettiği için checkbox'lar yeniden
 * mount oluyordu (odak ve geçici durum kayboluyordu).
 */
function PermissionCheckboxes({
  selected,
  onChange,
  disabled,
}: {
  selected: AdminPermission[];
  onChange: (next: AdminPermission[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ADMIN_PERMISSIONS.map((perm) => (
        <label
          key={perm}
          className={`flex items-center gap-2 text-xs ${disabled ? "opacity-50" : ""}`}
        >
          <input
            type="checkbox"
            checked={disabled || selected.includes(perm)}
            disabled={disabled}
            onChange={() => togglePermission(selected, onChange, perm)}
          />
          {PERMISSION_LABELS[perm]}
        </label>
      ))}
    </div>
  );
}

type AdminRow = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  brandId: string | null;
  brandName: string | null;
  permissions: AdminPermission[] | null;
  effectivePermissions: AdminPermission[];
};

const BRAND_MANAGER_DEFAULTS: AdminPermission[] = [
  "families",
  "images",
  "prices",
  "stock",
  "orders",
  "import",
  "salespeople",
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminRow[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<AdminRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<AdminRole>("BRAND_MANAGER");
  const [createBrandId, setCreateBrandId] = useState("");
  const [createPermissions, setCreatePermissions] = useState<AdminPermission[]>([
    ...BRAND_MANAGER_DEFAULTS,
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<AdminRole>("BRAND_MANAGER");
  const [editBrandId, setEditBrandId] = useState("");
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]);

  const loadData = useCallback(async () => {
    const [meRes, usersRes, brandsRes] = await Promise.all([
      fetch("/api/admin/me"),
      fetch("/api/admin/users"),
      fetch("/api/admin/brands"),
    ]);

    if (meRes.ok) {
      const me = await meRes.json();
      setMeId(me.id ?? null);
      setMeRole(me.role ?? null);
      if (!me.effectivePermissions?.includes("admins")) {
        setError("Bu sayfaya erişim yetkiniz yok");
        return;
      }
    } else {
      setError("Oturum doğrulanamadı");
      return;
    }

    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(data.users ?? []);
    } else {
      const data = await usersRes.json().catch(() => ({}));
      setError(data.error ?? "Kullanıcılar yüklenemedi");
    }

    if (brandsRes.ok) {
      const data = await brandsRes.json();
      setBrands(data.brands ?? []);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createName,
        email: createEmail,
        password: createPassword,
        role: createRole,
        brandId:
          createRole === "BRAND_MANAGER" && createBrandId ? createBrandId : null,
        permissions:
          createRole === "BRAND_MANAGER" ? createPermissions : null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Eklenemedi");
      return;
    }

    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setMessage(`"${data.user?.name}" eklendi`);
    await loadData();
  }

  function startEdit(user: AdminRow) {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditRole(user.role);
    setEditBrandId(user.brandId ?? "");
    setEditPermissions(
      user.permissions?.length
        ? user.permissions
        : user.role === "BRAND_MANAGER"
          ? [...BRAND_MANAGER_DEFAULTS]
          : [...ADMIN_PERMISSIONS]
    );
    setError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setActionId(id);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        email: editEmail,
        ...(editPassword ? { password: editPassword } : {}),
        role: editRole,
        brandId: editRole === "BRAND_MANAGER" && editBrandId ? editBrandId : null,
        permissions: editRole === "BRAND_MANAGER" ? editPermissions : null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi");
      return;
    }

    setMessage(`"${data.user?.name}" güncellendi`);
    cancelEdit();
    await loadData();
  }

  async function remove(user: AdminRow) {
    const ok = window.confirm(`"${user.name}" silinsin mi?`);
    if (!ok) return;

    setActionId(user.id);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Silinemedi");
      return;
    }

    setMessage(`"${user.name}" silindi`);
    if (editingId === user.id) cancelEdit();
    await loadData();
  }

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Admin Kullanıcıları</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Giriş hesapları ve yetki sınırları
          </p>
        </div>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
          ← Admin
        </Link>
      </div>

      {message && (
        <p className="mb-4 border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-8 space-y-4 border border-zinc-800 p-4"
      >
        <p className="text-xs font-semibold text-zinc-400">Yeni kullanıcı</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[11px] text-zinc-500">
            Ad
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-[11px] text-zinc-500">
            E-posta
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-[11px] text-zinc-500">
            Şifre
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-[11px] text-zinc-500">
            Rol
            <select
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value as AdminRole)}
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
            >
              <option value="BRAND_MANAGER">{ROLE_LABELS.BRAND_MANAGER}</option>
              {meRole === "SUPER" && (
                <option value="SUPER">Süper Admin</option>
              )}
            </select>
          </label>
          {createRole === "BRAND_MANAGER" && (
            <label className="block text-[11px] text-zinc-500 sm:col-span-2">
              Marka{" "}
              <span className="text-zinc-600">(opsiyonel — boş = tüm markalar)</span>
              <select
                value={createBrandId}
                onChange={(e) => setCreateBrandId(e.target.value)}
                className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
              >
                <option value="">Tüm markalar</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {createRole === "BRAND_MANAGER" ? (
          <div>
            <p className="mb-2 text-[11px] text-zinc-500">Yetkiler</p>
            <PermissionCheckboxes
              selected={createPermissions}
              onChange={setCreatePermissions}
            />
          </div>
        ) : (
          <p className="text-[11px] text-zinc-600">Süper admin tüm yetkilere sahiptir.</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="border border-zinc-600 px-4 py-2 text-sm font-semibold hover:border-white disabled:opacity-50"
        >
          Kullanıcı ekle
        </button>
      </form>

      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="border border-zinc-800 p-4">
            {editingId === user.id ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[11px] text-zinc-500">
                    Ad
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-[11px] text-zinc-500">
                    E-posta
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-[11px] text-zinc-500">
                    Yeni şifre (opsiyonel)
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Değiştirmek için yazın"
                      className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-[11px] text-zinc-500">
                    Rol
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as AdminRole)}
                      className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
                    >
                      <option value="BRAND_MANAGER">{ROLE_LABELS.BRAND_MANAGER}</option>
                      {meRole === "SUPER" && (
                        <option value="SUPER">Süper Admin</option>
                      )}
                    </select>
                  </label>
                  {editRole === "BRAND_MANAGER" && (
                    <label className="block text-[11px] text-zinc-500 sm:col-span-2">
                      Marka{" "}
                      <span className="text-zinc-600">(opsiyonel)</span>
                      <select
                        value={editBrandId}
                        onChange={(e) => setEditBrandId(e.target.value)}
                        className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
                      >
                        <option value="">Tüm markalar</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {editRole === "BRAND_MANAGER" ? (
                  <PermissionCheckboxes
                    selected={editPermissions}
                    onChange={setEditPermissions}
                  />
                ) : (
                  <p className="text-[11px] text-zinc-600">Süper admin — tüm yetkiler.</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(user.id)}
                    disabled={actionId === user.id}
                    className="border border-zinc-600 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs text-zinc-500"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">
                    {user.name}
                    {user.id === meId && (
                      <span className="ml-2 text-[10px] text-zinc-500">(siz)</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {ROLE_LABELS[user.role]}
                    {user.role === "BRAND_MANAGER" &&
                      ` · ${user.brandName ?? "Tüm markalar"}`}
                  </p>
                  {user.role === "BRAND_MANAGER" && (
                    <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
                      {user.effectivePermissions
                        .map((p) => PERMISSION_LABELS[p])
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(user)}
                    className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(user)}
                    disabled={actionId === user.id || user.id === meId}
                    className="border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-500 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
