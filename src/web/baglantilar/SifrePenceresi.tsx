import { useId, useState, type FormEvent } from 'react';
import { connectionAddress, type Connection, type SessionSecret } from '../../core/baglanti';
import { Diyalog } from '../ortak/Diyalog';

interface Props {
  connection: Connection;
  /** `ssh`: tünelin SSH şifresi ya da anahtar passphrase'i sorulur. */
  secret?: SessionSecret;
  /** Sunucunun önceki şifreyi reddetme nedeni (`28P01`); ilk soruşta `null`. */
  rejection: string | null;
  /** Hata mesajı döndürürse pencere açık kalır ve mesaj gösterilir. */
  onSubmit: (password: string, saveToKeychain: boolean) => Promise<string | null>;
  onCancel: () => void;
}

/**
 * Oturumluk şifre penceresi: keychain'e kaydedilmeyen bağlantı açılırken sorulur. Şifre Tezgah
 * kapanana kadar bellekte kalır; istenirse keychain'e kaydedilir (bağlantı ayarı değişir).
 */
export function SifrePenceresi({ connection, secret = 'veritabani', rejection, onSubmit, onCancel }: Props) {
  const ssh = secret === 'ssh' ? connection.ssh : null;
  const label = ssh ? (ssh.auth === 'password' ? 'SSH şifresi' : 'Passphrase') : 'Şifre';
  const address = ssh ? `${ssh.user}@${ssh.host}${ssh.port === 22 ? '' : `:${ssh.port}`}` : connectionAddress(connection);
  const id = useId();
  const [password, setPassword] = useState('');
  const [saveToKeychain, setSaveToKeychain] = useState(false);
  const [error, setError] = useState<string | null>(rejection);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password === '') return setError(`${label} gerekli`);
    setBusy(true);
    const failure = await onSubmit(password, saveToKeychain);
    setBusy(false);
    setError(failure);
  }

  return (
    <Diyalog
      baslik={
        <>
          <span className="ortam-noktasi" style={{ backgroundColor: connection.color ?? 'transparent' }} aria-hidden="true" />
          {connection.name}
        </>
      }
      etiket={ssh ? `${connection.name} ${label}` : `${connection.name} şifresi`}
      className="sifre-penceresi"
      onClose={onCancel}
      onSubmit={submit}
      dugmeler={
        <>
          <span className="bosluk" />
          <button type="button" onClick={onCancel}>
            İptal
          </button>
          <button type="submit" className="birincil" disabled={busy}>
            Bağlan
          </button>
        </>
      }
    >
      <p className="soluk">{ssh ? `SSH tüneli · ${address}` : address}</p>
      <div className="alan">
        <label htmlFor={`${id}-sifre`}>{label}</label>
        <input
          id={`${id}-sifre`}
          type="password"
          data-autofocus
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hata` : undefined}
        />
        {error && (
          <span id={`${id}-hata`} role="alert" className="alan-hatasi">
            {error}
          </span>
        )}
        <p className="soluk kucuk">Tezgah kapanana kadar bellekte tutulur, diske yazılmaz.</p>
      </div>
      <label className="kutu">
        <input type="checkbox" checked={saveToKeychain} onChange={(e) => setSaveToKeychain(e.target.checked)} />
        Keychain'e kaydet (bağlantı ayarını değiştirir)
      </label>
    </Diyalog>
  );
}
