import { SHORTCUTS, SHORTCUT_GROUPS, shortcutText } from '../../core/kisayollar';
import { Diyalog } from './Diyalog';
import { PLATFORM } from './pencere';

/** Tüm kısayollar, katalogdaki gruplarla (`?`, paletteki "Kısayollar" ya da durum çubuğundan açılır). */
export function KisayolSayfasi({ onClose }: { onClose: () => void }) {
  return (
    <Diyalog baslik="Kısayollar" className="kisayol-sayfasi" onClose={onClose}>
      <div className="kisayol-gruplari">
        {SHORTCUT_GROUPS.map((grup) => (
          <section key={grup} className="kisayol-grubu">
            <h3>{grup}</h3>
            <table aria-label={grup} className="kisayol-tablosu">
              <tbody>
                {SHORTCUTS.filter((s) => s.grup === grup).map((s) => (
                  <tr key={s.id}>
                    <td>{s.aciklama}</td>
                    <td>
                      <kbd className="kisayol-ipucu">{shortcutText(s.id, PLATFORM)}</kbd>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </Diyalog>
  );
}
