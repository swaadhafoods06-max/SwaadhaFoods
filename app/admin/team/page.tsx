'use client';
import { Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';
import { navigation } from '@/components/admin/config';

export default function TeamPage() {
  const { busy, members, revokeMember, setMemberEdit } = useAdmin();
  return (
    <>
      <title>Sub-admins & access · Kitchen admin | Swaadha</title>
      <div className="access-explainer">
        <ShieldCheck size={22} />
        <div>
          <b>Owner-controlled access</b>
          <p>
            Sub-admins see only their assigned tabs. Add one with an email and password and they can sign in at /admin straight away, or
            leave the password blank to grant access to an existing Swaadha account. Only owners can manage this page.
          </p>
        </div>
      </div>
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Team member</th>
              <th>Role</th>
              <th>Tab access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user_id}>
                <td>
                  <b>{m.name}</b>
                  <small>{m.email || 'Owner account'}</small>
                </td>
                <td>
                  <span className="status available">{m.role === 'owner' ? 'Owner' : 'Sub-admin'}</span>
                </td>
                <td>
                  <div className="permission-pills">
                    {m.role === 'owner' ? (
                      <span>All tabs</span>
                    ) : m.permissions.length ? (
                      m.permissions.map((p) => <span key={p}>{navigation.find((n) => n.id === p)?.label || p}</span>)
                    ) : (
                      <span>No tabs assigned</span>
                    )}
                  </div>
                </td>
                <td>
                  {m.role === 'staff' ? (
                    <div className="team-actions">
                      <button aria-label={`Edit access for ${m.name}`} onClick={() => setMemberEdit(m)}>
                        <Pencil size={16} />
                      </button>
                      <button aria-label={`Revoke access for ${m.name}`} disabled={busy} onClick={() => revokeMember(m)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <small>Protected owner</small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
