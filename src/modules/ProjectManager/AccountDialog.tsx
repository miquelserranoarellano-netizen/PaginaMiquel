/**
 * Iniciar sesión / crear cuenta (usuario y contraseña) en la web publicada, y
 * subir a la cuenta los proyectos guardados en este dispositivo.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Eye, EyeOff, LogOut, UploadCloud, UserRound, X } from 'lucide-react';
import { Button } from '@/modules/UI/controls';
import { toast } from '@/modules/UI/toast';
import { accountAdapter, accountLogin, accountLogout, useAccount } from './account';
import { countLocalProjects, uploadLocalProjects } from './migrate';

const input = 'h-11 w-full rounded-lg border border-slate-200 px-3 text-[15px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100';

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-slate-500">{text}</span>
      {children}
    </label>
  );
}

export function AccountButton({ onClick }: { onClick: () => void }) {
  const username = useAccount((s) => s.username);
  return (
    <Button onClick={onClick} variant={username ? 'default' : 'primary'} title={username ? `Sesión iniciada como ${username}` : 'Entra para ver tus casas en cualquier dispositivo'}>
      <UserRound size={14} className={username ? 'text-accent-600' : undefined} />
      <span className="max-w-[160px] truncate">{username ?? 'Iniciar sesión'}</span>
    </Button>
  );
}

function LoginForm() {
  const signup = useAccount((s) => s.signup);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async (create: boolean) => {
    setErr(null);
    if (username.trim().length < 3) return setErr('Escribe tu usuario');
    if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres');
    setBusy(true);
    try {
      await accountLogin(username, password, create);
      toast.success(create ? 'Cuenta creada: tus proyectos se guardan en ella' : 'Sesión iniciada');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void go(false);
      }}
    >
      <Label text="Usuario">
        <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </Label>
      <Label text="Contraseña">
        <div className="relative">
          <input className={`${input} pr-11`} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Label>
      {err && <p className="text-[12.5px] text-red-600">{err}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {signup && (
          <Button disabled={busy} onClick={() => void go(true)}>
            Crear cuenta
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </div>
      <p className="text-[11.5px] leading-relaxed text-slate-500">
        Con la sesión iniciada, tus casas se guardan en tu cuenta y las verás al entrar desde el móvil, la tablet u otro ordenador. {signup ? 'La primera vez pulsa «Crear cuenta».' : ''}
      </p>
    </form>
  );
}

function SignedIn({ onChanged }: { onChanged: () => void }) {
  const username = useAccount((s) => s.username);
  const [local, setLocal] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    void countLocalProjects().then(setLocal);
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 px-3 py-2.5">
        <UserRound size={18} className="shrink-0 text-accent-700" />
        <div className="min-w-0 text-[12.5px] leading-snug text-accent-900">
          Sesión iniciada como <b className="break-all">{username}</b>. Tus proyectos se guardan automáticamente en tu cuenta.
        </div>
      </div>
      {local !== null && local > 0 && (
        <div className="rounded-xl border border-slate-200 px-3 py-2.5">
          <p className="text-[12.5px] text-slate-600">
            {done
              ? 'Los proyectos de este dispositivo ya están también en tu cuenta.'
              : `Tienes ${local} proyecto${local === 1 ? '' : 's'} guardado${local === 1 ? '' : 's'} solo en este dispositivo.`}
          </p>
          <Button
            className="mt-2"
            variant={done ? 'default' : 'primary'}
            disabled={!!busy || done}
            onClick={async () => {
              try {
                const r = await uploadLocalProjects(accountAdapter(), (i, n) => setBusy(`Subiendo ${i} de ${n}…`));
                toast.success(r.uploaded ? `${r.uploaded} proyecto${r.uploaded === 1 ? '' : 's'} subido${r.uploaded === 1 ? '' : 's'} a tu cuenta` : 'Ya estaban todos en tu cuenta');
                setDone(true);
                onChanged();
              } catch (e) {
                toast.error(`No se pudo subir: ${e instanceof Error ? e.message : String(e)}`);
              } finally {
                setBusy(null);
              }
            }}
          >
            <UploadCloud size={14} /> {busy ?? (done ? 'Subidos' : 'Subir a mi cuenta')}
          </Button>
        </div>
      )}
      <div className="flex justify-end">
        <Button
          onClick={async () => {
            await accountLogout();
            toast.info('Sesión cerrada');
            onChanged();
          }}
        >
          <LogOut size={14} /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export function AccountDialog({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const username = useAccount((s) => s.username);
  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="hd-account-title" className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl thin-scroll">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="hd-account-title" className="text-[16px] font-semibold text-slate-900">
              {username ? 'Tu cuenta' : 'Iniciar sesión'}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500">Tus casas, en cualquier dispositivo.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title="Cerrar">
            <X size={16} />
          </button>
        </div>
        {username ? <SignedIn onChanged={onChanged} /> : <LoginForm />}
      </div>
    </div>
  );
}
