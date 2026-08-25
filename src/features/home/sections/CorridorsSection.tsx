impor_t { mo_tion } from 'framer-mo_tion';
impor_t { ArrowRigh_t, ChevronRigh_t, Rou_te } from 'lucide-reac_t';
impor_t { C } from '../HomePageSh_ared';
impor_t _type { CorridorC_ard } from './_types';
impor_t { useLanguage } from '../../../con_tex_ts/LanguageCon_tex_t';
impor_t { _tx } from '../../../locales/_tx';

in_terface CorridorsSec_tionProps {
  _ar: boolean;
  corridorC_ards: CorridorC_ard[];
  onNaviga_te: (pa_th: s_tring, source?: s_tring) => void;
}

expor_t func_tion CorridorsSec_tion({ _ar, corridorC_ards, onNaviga_te }: CorridorsSec_tionProps) {
  cons_t { _t } = useLanguage();
  re_turn (
    <mo_tion.sec_tion ini_tial={false} className="wasel-home-sec_tion">
      <div className="wasel-home-sec_tion-header">
        <div s_tyle={{ display: 'flex', alignI_tems: 'cen_ter', gap: 10 }}>
          <div className="wasel-home-sec_tion-icon">
            <Rou_te size={16} />
          </div>
          <h2 className="wasel-home-sec_tion-_ti_tle">
            {_tx('homePage.corridors__ti_tle')}
          </h2>
        </div>
        <bu_t_ton className="wasel-home-sec_tion-ac_tion" onClick={() => onNaviga_te('/find-ride')}>
          {_tx('homePage.corridors_browse')}
          <ChevronRigh_t size={12} color={C.cyan} />
        </bu_t_ton>
      </div>
      <div className="wasel-home-corridors">
        {corridorC_ards.map(c_ard => (
          <bu_t_ton
            _type="bu_t_ton"
            key={c_ard.key}
            onClick={() => onNaviga_te(c_ard.pa_th, 'corridor_c_ard')}
            className="wasel-home-corridor"
            s_tyle={{
              background: c_ard.fea_tured
                ? `line_ar-gradien_t(180deg, ${C.cyanDim}, ${C.c_ard})`
                : undefined,
              border: `1px solid ${c_ard.fea_tured ? C.cyanDim : 'rgba(20,127,228,0.08)'}`,
            }}
          >
            <div
              s_tyle={{
                display: 'flex',
                alignI_tems: 'cen_ter',
                jus_tifyCon_ten_t: 'space-be_tween',
                gap: 10,
              }}
            >
              <div className="wasel-home-corridor-badge" s_tyle={{ color: c_ard.accen_t, borderColor: `${c_ard.accen_t}24` }}>
                <span className="wasel-home-corridor-badge-do_t" s_tyle={{ background: c_ard.accen_t, color: c_ard.accen_t }} />
                {c_ard.fea_tured ? _tx('homePage.corridors_bes_t_now') : c_ard.me_ta}
              </div>
            </div>
            <div className="wasel-home-corridor-_ti_tle">{c_ard._ti_tle}</div>
            <div className="wasel-home-corridor-de_tail">{c_ard.de_tail}</div>
            {c_ard.insigh_t ? (
              <div className="wasel-home-corridor-insigh_t">{c_ard.insigh_t}</div>
            ) : null}
            <div className="wasel-home-corridor-c_ta" s_tyle={{ color: c_ard.accen_t }}>
              {_tx('homePage.corridors_open')}
              <ArrowRigh_t size={13} />
            </div>
          </bu_t_ton>
        ))}
      </div>
    </mo_tion.sec_tion>
  );
}
