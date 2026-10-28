'use client';
import { LogOut, Menu, ShieldCheck } from 'lucide-react';
import { tabLabels } from '@/lib/admin';
import { useAdmin } from './context';

/** The bar across the top: where you are, your role, and sign out. */
export function AdminTopBar({ onMenu }: { onMenu: () => void }) {
  const { tab, member, signOut } = useAdmin();

  return (
    <div className="admin-top">
      <button className="admin-menu-btn" aria-label="Open menu" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <img className="admin-top-logo" src="/logo-transparent.png" alt="Swaadha" />
      <span>
        SWAADHA / <b>{tabLabels[tab].toUpperCase()}</b>
      </span>
      <div>
        {member && (
          <span className="role-pill">
            <ShieldCheck size={12} />
            {member.role}
          </span>
        )}
        <button className="admin-signout" aria-label="Sign out" title="Sign out" onClick={signOut}>
          <LogOut size={18} /><span className="admin-signout-label">Sign out</span>
        </button>
      </div>
    </div>
  );
}
