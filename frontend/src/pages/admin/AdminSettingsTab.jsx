import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { getAdminSettings, updateAdminSettings } from "../../api/admin";
import { s } from "./adminShared";

export default function AdminSettingsTab() {
  const { t } = useTranslation("admin");

  const [settings, setSettings]           = useState(null);
  const [settingsLoading, setSTL]         = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg]     = useState("");
  const [settingsErr, setSettingsErr]     = useState("");

  const loadSettings = useCallback(async () => {
    setSTL(true);
    try { const r = await getAdminSettings(); setSettings(r.data); }
    finally { setSTL(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const setVatRate = (pct) => setSettings(s => ({ ...s, vatRate: Number(pct) / 100 }));
  const setDefaultDelivery = (v) => setSettings(s => ({ ...s, defaultDeliveryCharge: Number(v) }));
  const setDistrictCharge = (idx, field, value) => setSettings(s => ({ ...s, districtDeliveryCharges: s.districtDeliveryCharges.map((d, i) => i === idx ? { ...d, [field]: field === "charge" ? Number(value) : value } : d) }));
  const addDistrictCharge = () => setSettings(s => ({ ...s, districtDeliveryCharges: [...s.districtDeliveryCharges, { district: "", charge: 0 }] }));
  const removeDistrictCharge = (idx) => setSettings(s => ({ ...s, districtDeliveryCharges: s.districtDeliveryCharges.filter((_, i) => i !== idx) }));

  const handleSaveSettings = async () => {
    if (settings.districtDeliveryCharges.some(d => !d.district.trim())) {
      setSettingsErr(t("districtRowError"));
      return;
    }
    setSettingsErr(""); setSettingsMsg(""); setSettingsSaving(true);
    try {
      const r = await updateAdminSettings(settings);
      setSettings(r.data);
      setSettingsMsg(t("settingsSaved"));
    } catch (err) {
      setSettingsErr(err.response?.data?.message || t("saveFailed"));
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div>
      <h2 style={s.pageTitle}>{t("settingsTitle")}</h2>
      {settingsLoading && <p style={{ color: "var(--muted)" }}>{t("loadingSettings")}</p>}
      {!settingsLoading && settings && (
        <div style={{ ...s.tableWrap, padding: "28px 28px 32px", maxWidth: 640 }}>
          {settingsErr && <div style={s.formErr}>{settingsErr}</div>}
          {settingsMsg && <div style={{ background: "#DCFCE7", color: "#166534", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Check size={14} /> {settingsMsg}</div>}

          <h3 style={s.sectionTitle}>{t("pricing")}</h3>
          <label style={s.label}>
            {t("vatRate")}
            <input
              className="input"
              type="number" min="0" max="100" step="0.1"
              value={Math.round(settings.vatRate * 1000) / 10}
              onChange={e => setVatRate(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </label>
          <label style={s.label}>
            {t("defaultDeliveryCharge")}
            <input
              className="input"
              type="number" min="0"
              value={settings.defaultDeliveryCharge}
              onChange={e => setDefaultDelivery(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </label>

          <h3 style={{ ...s.sectionTitle, marginTop: 24 }}>{t("districtDeliveryCharges")}</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
            {t("districtHint")}
          </p>
          {settings.districtDeliveryCharges.map((d, idx) => (
            <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <input
                className="input"
                placeholder={t("districtNamePlaceholder")}
                value={d.district}
                onChange={e => setDistrictCharge(idx, "district", e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                className="input"
                type="number" min="0"
                placeholder={t("chargePlaceholder")}
                value={d.charge}
                onChange={e => setDistrictCharge(idx, "charge", e.target.value)}
                style={{ width: 110 }}
              />
              <button onClick={() => removeDistrictCharge(idx)} style={s.delBtn}>{t("remove")}</button>
            </div>
          ))}
          <button className="btn btn-outline" onClick={addDistrictCharge} style={{ marginTop: 4, marginBottom: 24 }}>
            {t("addDistrict")}
          </button>

          <h3 style={{ ...s.sectionTitle, marginTop: 24 }}>{t("language")}</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
            {t("defaultLanguageHint")}
          </p>
          <label style={s.label}>
            {t("defaultLanguage")}
            <select
              className="input"
              value={settings.defaultLanguage || "en"}
              onChange={e => setSettings(s => ({ ...s, defaultLanguage: e.target.value }))}
              style={{ maxWidth: 160 }}
            >
              <option value="en">{t("english")}</option>
              <option value="bn">{t("bangla")}</option>
            </select>
          </label>

          <h3 style={{ ...s.sectionTitle, marginTop: 24 }}>{t("bkashSectionTitle")}</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8, marginBottom: 14 }}>
            {t("bkashSectionHint")}
          </p>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={s.label}>
                {t("bkashMerchantNumberLabel")}
                <input
                  className="input"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={settings.bkashMerchantNumber || ""}
                  onChange={e => setSettings(s => ({ ...s, bkashMerchantNumber: e.target.value }))}
                  style={{ maxWidth: 220 }}
                />
              </label>
              <label style={s.label}>
                {t("bkashNumberTypeLabel")}
                <select
                  className="input"
                  value={settings.bkashNumberType || "personal"}
                  onChange={e => setSettings(s => ({ ...s, bkashNumberType: e.target.value }))}
                  style={{ maxWidth: 220 }}
                >
                  <option value="personal">{t("bkashTypePersonalOpt")}</option>
                  <option value="merchant">{t("bkashTypeMerchantOpt")}</option>
                </select>
              </label>
            </div>
          </div>

          <div>
            <button className="btn btn-gold" onClick={handleSaveSettings} disabled={settingsSaving}>
              {settingsSaving ? t("saving") : t("saveSettings")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
