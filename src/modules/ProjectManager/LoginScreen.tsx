/**
 * Primera pantalla de la web: iniciar sesión (o crear la cuenta) para que los
 * proyectos se guarden en la cuenta y se vean desde cualquier dispositivo.
 */
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from '@/modules/UI/toast';
import { accountLogin, continueAsGuest, isUnknownUser, useAccount } from './account';

const input = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] text-slate-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100';

export function LoginScreen() {
  const signup = useAccount((s) => s.signup);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const creating = mode === 'signup';

  const submit = async () => {
    setErr(null);
    if (username.trim().length < 3) return setErr('Escribe tu usuario');
    if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres');
    if (creating && password !== password2) return setErr('Las contraseñas no coinciden');
    setBusy(true);
    try {
      await accountLogin(username, password, creating);
      toast.success(creating ? `Cuenta creada. ¡Bienvenido, ${username.trim()}!` : `Hola, ${username.trim()}`);
    } catch (e) {
      if (!creating && isUnknownUser(e) && signup) {
        // El usuario no existe todavía: se pasa a «Crear cuenta» conservando lo escrito.
        setMode('signup');
        setPassword2('');
        setErr(`El usuario «${username.trim()}» todavía no existe. Repite la contraseña y pulsa «Crear cuenta» para crearlo.`);
      } else setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-canvas px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="./icon.svg" alt="" className="h-14 w-14" />
          <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-slate-900">HomeDesign Studio</h1>
          <p className="mt-1 text-[13.5px] text-slate-500">{creating ? 'Crea tu cuenta para guardar tus casas' : 'Inicia sesión para ver tus casas en cualquier dispositivo'}</p>
        </div>
        <form
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-[12.5px] font-medium text-slate-600">Usuario</span>
            <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12.5px] font-medium text-slate-600">Contraseña</span>
            <div className="relative">
              <input className={`${input} pr-12`} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={creating ? 'new-password' : 'current-password'} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {creating && (
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-medium text-slate-600">Repite la contraseña</span>
              <input className={input} type={show ? 'text' : 'password'} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
            </label>
          )}
          {err && <p className="text-[13px] text-red-600">{err}</p>}
          <button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-accent-600 text-[15px] font-semibold text-white shadow-sm transition hover:bg-accent-700 disabled:opacity-50">
            {busy ? (creating ? 'Creando cuenta…' : 'Entrando…') : creating ? 'Crear cuenta' : 'Entrar'}
          </button>
          {signup && (
            <p className="pt-1 text-center text-[13px] text-slate-500">
              {creating ? '¿Ya tienes cuenta? ' : '¿Todavía no tienes cuenta? '}
              <button
                type="button"
                className="font-semibold text-accent-700 hover:underline"
                onClick={() => {
                  setMode(creating ? 'login' : 'signup');
                  setErr(null);
                }}
              >
                {creating ? 'Inicia sesión' : 'Crear cuenta'}
              </button>
            </p>
          )}
        </form>
        <p className="mt-5 text-center text-[12px] text-slate-400">
          <button type="button" className="underline-offset-2 hover:text-slate-600 hover:underline" onClick={continueAsGuest}>
            Seguir sin cuenta
          </button>{' '}
          (los proyectos se guardan solo en este navegador)
        </p>
      </div>
    </div>
  );
}
