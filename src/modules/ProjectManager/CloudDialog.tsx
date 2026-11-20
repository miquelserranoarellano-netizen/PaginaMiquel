/**
 * Conexión con Supabase: configurar el proyecto, entrar o crear cuenta y
 * subir a la nube los proyectos guardados en este dispositivo.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Cloud, CloudOff, LogOut, UploadCloud, X } from 'lucide-react';
import { Button } from '@/modules/UI/controls';
import { dialog } from '@/modules/UI/dialog';
import { toast } from '@/modules/UI/toast';
import { checkPublicKey, checkUrl, cloudAdapter, saveConfig, signIn, signOut, signUp, useCloud } from './cloud';
import { isEmbeddedPage } from './files';
import { countLocalProjects, uploadLocalProjects } from './migrate';
import { useStorageLocation } from './storage';

const input = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-[14px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100';

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-slate-500">{text}</span>
      {children}
    </label>
  );
}

/** Botón de estado para la cabecera de la lista de proyectos. */
export function CloudButton({ onClick }: { onClick: () => void }) {
  const { config, email } = useCloud();
  const account = useStorageLocation((s) => s.local === 'claude');
  if (account && !email)
    return (
      <Button onClick={onClick} title="Tus proyectos se guardan en tu cuenta de Claude">
        <Cloud size={14} className="text-accent-600" />
        <span>En tu cuenta de Claude</span>
      </Button>
    );
  return (
    <Button onClick={onClick} title={email ? `Guardando en la nube como ${email}` : 'Guardar tus proyectos en Supabase'}>
      {email ? <Cloud size={14} className="text-accent-600" /> : <CloudOff size={14} />}
      <span className="max-w-[160px] truncate">{email ? email : config ? 'Entrar en la nube' : 'Guardar en la nube'}</span>
    </Button>
  );
}

function ConfigStep() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const problem = checkUrl(url) ?? checkPublicKey(key);
        if (problem) return setErr(problem);
        saveConfig({ url, anonKey: key });
        toast.success('Proyecto de Supabase conectado. Ahora entra o crea tu cuenta.');
      }}
    >
      <ol className="list-decimal space-y-1 pl-4 text-[12.5px] leading-relaxed text-slate-600">
        <li>
          En Supabase, abre <b>SQL Editor</b> y ejecuta el script <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code> del repositorio (crea la tabla <i>projects</i> con sus permisos).
        </li>
        <li>
          En <b>Project Settings → API</b> copia la <b>URL del proyecto</b> y la clave <b>pública</b> (<i>anon</i> o <i>publishable</i>). Nunca la <i>service_role</i> ni la secreta.
        </li>
      </ol>
      <Label text="URL del proyecto">
        <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" autoComplete="off" spellCheck={false} inputMode="url" />
      </Label>
      <Label text="Clave pública (anon / publishable)">
        <input className={input} value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi… o sb_publishable_…" autoComplete="off" spellCheck={false} />
      </Label>
      {err && <p className="text-[12.5px] text-red-600">{err}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          Conectar
        </Button>
      </div>
    </form>
  );
}

function SignInStep() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const url = useCloud((s) => s.config?.url);
  const go = async (mode: 'in' | 'up') => {
    setErr(null);
    setInfo(null);
    if (!email.includes('@')) return setErr('Escribe tu email');
    if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres');
    setBusy(true);
    try {
      if (mode === 'in') {
        await signIn(email, password);
        toast.success('Sesión iniciada: tus proyectos se guardan en la nube');
      } else if (await signUp(email, password)) setInfo('Cuenta creada. Abre el enlace que te ha llegado por email y vuelve aquí para entrar.');
      else toast.success('Cuenta creada: tus proyectos se guardan en la nube');
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
        void go('in');
      }}
    >
      <p className="text-[12.5px] text-slate-600">
        Proyecto: <span className="font-medium text-slate-800">{url?.replace(/^https?:\/\//, '')}</span>
      </p>
      <Label text="Email">
        <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Label>
      <Label text="Contraseña">
        <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </Label>
      {err && <p className="text-[12.5px] text-red-600">{err}</p>}
      {info && <p className="text-[12.5px] text-accent-700">{info}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          className="text-[12px] text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          onClick={async () => {
            if (await dialog.confirm({ title: '¿Cambiar de proyecto de Supabase?', message: 'Se olvidará la URL y la clave guardadas en este dispositivo. Tus proyectos en la nube no se borran.', confirmText: 'Cambiar' })) saveConfig(null);
          }}
        >
          Cambiar proyecto de Supabase
        </button>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => void go('up')}>
            Crear cuenta
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SignedInStep({ onChanged }: { onChanged: () => void }) {
  const email = useCloud((s) => s.email);
  const [local, setLocal] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  useEffect(() => {
    void countLocalProjects().then(setLocal);
  }, []);
  const upload = async () => {
    const r = await uploadLocalProjects(cloudAdapter(), (i, n) => setBusy(`Subiendo ${i} de ${n}…`));
    toast.success(r.uploaded ? `${r.uploaded} proyecto${r.uploaded === 1 ? '' : 's'} subido${r.uploaded === 1 ? '' : 's'} a la nube${r.skipped ? ` (${r.skipped} ya estaban)` : ''}` : 'Todos tus proyectos ya estaban en la nube');
    setUploaded(true);
    onChanged();
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 px-3 py-2.5">
        <Cloud size={18} className="shrink-0 text-accent-700" />
        <div className="min-w-0 text-[12.5px] leading-snug text-accent-900">
          Conectado como <b className="break-all">{email}</b>. Los proyectos se guardan automáticamente en tu cuenta y puedes abrirlos desde cualquier dispositivo.
        </div>
      </div>
      {local !== null && local > 0 && (
        <div className="rounded-xl border border-slate-200 px-3 py-2.5">
          <p className="text-[12.5px] text-slate-600">
            {uploaded
              ? 'Tus proyectos de este dispositivo ya están también en la nube. La copia local se conserva por si cierras sesión.'
              : `Tienes ${local} proyecto${local === 1 ? '' : 's'} guardado${local === 1 ? '' : 's'} solo en este dispositivo.`}
          </p>
          <Button
            className="mt-2"
            variant={uploaded ? 'default' : 'primary'}
            disabled={!!busy || uploaded}
            onClick={async () => {
              try {
                await upload();
              } catch (e) {
                toast.error(`No se pudo subir: ${e instanceof Error ? e.message : String(e)}`);
              } finally {
                setBusy(null);
              }
            }}
          >
            <UploadCloud size={14} /> {busy ?? (uploaded ? 'Subidos' : 'Subir a la nube')}
          </Button>
        </div>
      )}
      <div className="flex justify-end">
        <Button
          onClick={async () => {
            await signOut();
            toast.info('Sesión cerrada: los proyectos vuelven a guardarse en este dispositivo');
            onChanged();
          }}
        >
          <LogOut size={14} /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export function CloudDialog({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const { config, email } = useCloud();
  const embedded = isEmbeddedPage();
  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="hd-cloud-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl thin-scroll">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="hd-cloud-title" className="text-[15px] font-semibold text-slate-900">
              Guardar en la nube (Supabase)
            </h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500">Tus proyectos en tu cuenta, disponibles en el móvil, el ordenador y la web.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title="Cerrar">
            <X size={16} />
          </button>
        </div>
        {embedded ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-900">
            Aquí, dentro de Claude, tus proyectos ya se guardan automáticamente en tu cuenta de Claude (los verás también desde el móvil). La página no puede conectarse a servicios externos como Supabase: para usarlo, abre la app en su web (Cloudflare) o en la versión de escritorio. Puedes llevarte un proyecto con Exportar (.hdsp) e importarlo allí.
          </p>
        ) : !config ? (
          <ConfigStep />
        ) : !email ? (
          <SignInStep />
        ) : (
          <SignedInStep onChanged={onChanged} />
        )}
      </div>
    </div>
  );
}
