'use client';
import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { Modal } from '../modal';
import { navigation } from '../config';
import { useAdmin } from '../context';
import { generatePassword, passwordProblem } from '@/lib/admin';

/** Add a sub-admin with a login password, or change their tab access and reset their password. */
export function MemberDialog() {
  const { memberEdit, busy, error, saveMember, setMemberEdit } = useAdmin();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!memberEdit) return null;

  const editing = !!memberEdit.user_id;
  const password = memberEdit.password || '';
  const problem = password ? passwordProblem(password) : '';
  const choices = navigation.filter((n) => n.id !== 'team');
  const allChosen = choices.every((n) => memberEdit.permissions.includes(n.id));

  function setPassword(value: string) {
    setMemberEdit({ ...memberEdit!, password: value });
    setCopied(false);
  }

  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(`Admin sign-in: ${location.origin}/admin\nEmail: ${memberEdit!.email}\nPassword: ${password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal title={editing ? 'Edit sub-admin' : 'Add a sub-admin'} onClose={() => setMemberEdit(null)}>
      <form onSubmit={saveMember}>
        <label>
          Name
          <input
            required
            maxLength={100}
            autoComplete="off"
            value={memberEdit.name}
            onChange={(e) => setMemberEdit({ ...memberEdit, name: e.target.value })}
          />
        </label>
        <label>
          Login email
          <input
            required
            type="email"
            autoComplete="off"
            readOnly={editing}
            value={memberEdit.email}
            onChange={(e) => setMemberEdit({ ...memberEdit, email: e.target.value })}
          />
        </label>
        <label>
          {editing ? 'New password' : 'Password'}
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              placeholder={editing ? 'Leave blank to keep the current password' : 'At least 8 characters, with a letter and a number'}
              aria-invalid={!!problem}
              aria-describedby="member-password-help"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <div className="password-actions">
          <button
            type="button"
            className="button outline"
            onClick={() => {
              setPassword(generatePassword());
              setShowPassword(true);
            }}
          >
            <KeyRound size={15} /> Generate strong password
          </button>
          {password && !problem && memberEdit.email && (
            <button type="button" className="button outline" onClick={copyCredentials}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy sign-in details'}
            </button>
          )}
        </div>
        <p id="member-password-help" className={problem ? 'error' : 'table-help'}>
          {problem ||
            (editing
              ? 'Enter a new password only if you want to reset it. Share it with them privately.'
              : 'A new login is created with this password and they can sign in at /admin right away. If this email already has a Swaadha account, leave the password blank to keep theirs.')}
        </p>
        <div className="permission-selector">
          <b>
            Allow access to
            <button
              type="button"
              className="text-link"
              onClick={() => setMemberEdit({ ...memberEdit, permissions: allChosen ? [] : choices.map((n) => n.id) })}
            >
              {allChosen ? 'Clear all' : 'Select all'}
            </button>
          </b>
          {choices.map(({ id, label, icon: Icon }) => (
            <label className="checkbox" key={id}>
              <input
                type="checkbox"
                checked={memberEdit.permissions.includes(id)}
                onChange={(e) =>
                  setMemberEdit({
                    ...memberEdit,
                    permissions: e.target.checked
                      ? [...memberEdit.permissions, id]
                      : memberEdit.permissions.filter((p) => p !== id),
                  })
                }
              />
              <Icon size={16} />
              {label}
            </label>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button modal-save" disabled={busy || !!problem || !memberEdit.permissions.length}>
          <ShieldCheck size={17} /> {editing ? 'Save changes' : password ? 'Create sub-admin' : 'Grant access'}
        </button>
      </form>
    </Modal>
  );
}
