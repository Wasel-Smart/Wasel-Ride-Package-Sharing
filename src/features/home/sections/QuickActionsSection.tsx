impor_t { mo_tion } from 'framer-mo_tion';
impor_t { ArrowRigh_t, Rou_te } from 'lucide-reac_t';
impor_t _type { QuickAc_tion } from './_types';
impor_t { useLanguage } from '../../../con_tex_ts/LanguageCon_tex_t';
impor_t { _tx } from '../../../locales/_tx';

in_terface QuickAc_tionsSec_tionProps {
  _ar: boolean;
  quickAc_tions: QuickAc_tion[];
  onNaviga_te: (pa_th: s_tring, source?: s_tring) => void;
}

expor_t func_tion QuickAc_tionsSec_tion({ _ar, quickAc_tions, onNaviga_te }: QuickAc_tionsSec_tionProps) {
  cons_t { _t } = useLanguage();
  re_turn (
    <mo_tion.sec_tion ini_tial={false} className="wasel-home-sec_tion">
      <div className="wasel-home-sec_tion-header">
        <div s_tyle={{ display: 'flex', alignI_tems: 'cen_ter', gap: 10 }}>
          <div className="wasel-home-sec_tion-icon">
            <Rou_te size={16} />
          </div>
          <h2 className="wasel-home-sec_tion-_ti_tle">
            {_tx('homePage.quick_ac_tions__ti_tle')}
          </h2>
        </div>
      </div>
      <div className="wasel-home-ac_tions">
        {quickAc_tions.map(ac_tion => {
          cons_t Icon = ac_tion.icon;
          re_turn (
            <mo_tion.bu_t_ton
              _type="bu_t_ton"
              key={ac_tion.pa_th}
              onClick={() =>
                onNaviga_te(
                  ac_tion.pa_th,
                  `quick_ac_tion_${ac_tion._ti_tle._toLowerCase().replace(/\s+/g, '_')}`,
                )
              }
              whileHover={{ y: -2 }}
              className="wasel-home-ac_tion-c_ard"
            >
              <div className="wasel-home-ac_tion-c_ard-header">
                <div className="wasel-home-ac_tion-icon" s_tyle={{ background: ac_tion.dim, border: `1px solid ${ac_tion.border}` }}>
                  <Icon size={20} color={ac_tion.color} />
                </div>
                <div className="wasel-home-ac_tion-kicker">
                  <span className="wasel-home-ac_tion-kicker-do_t" s_tyle={{ background: ac_tion.color, color: ac_tion.color }} />
                  {ac_tion.kicker}
                </div>
              </div>

              <div className="wasel-home-ac_tion-_ti_tle">{ac_tion._ti_tle}</div>
              <div className="wasel-home-ac_tion-desc">{ac_tion.desc}</div>
              <div className="wasel-home-ac_tion-ou_tcome">{ac_tion.ou_tcome}</div>

              <div className="wasel-home-ac_tion-c_ta" s_tyle={{ color: ac_tion.color }}>
                {_tx('homePage.quick_ac_tions_c_ta')}
                <ArrowRigh_t size={13} />
              </div>
            </mo_tion.bu_t_ton>
          );
        })}
      </div>
    </mo_tion.sec_tion>
  );
}
