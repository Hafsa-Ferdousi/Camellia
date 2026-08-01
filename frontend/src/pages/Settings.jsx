import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { updateProfile, updateAddress } from "../api/auth";
import { districts } from "../data/districts";

export default function Settings() {
  const { t } = useTranslation("settings");
  const { user, setUser } = useAuth();
  const { setLanguage } = useLanguage();

  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0] || {};

  const [profile, setProfile] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    preferredLanguage: user?.preferredLanguage || "en",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [address, setAddress] = useState({
    addressLine: defaultAddress.addressLine || "",
    district: defaultAddress.district || "",
    city: defaultAddress.city || "",
    phone: defaultAddress.phone || user?.phone || "",
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [addressError, setAddressError] = useState("");

  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState("");

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(""); setProfileMessage(""); setProfileSaving(true);
    try {
      const { data } = await updateProfile(profile);
      setUser(data);
      setLanguage(data.preferredLanguage);
      setProfileMessage(t("profileUpdated"));
    } catch (err) {
      setProfileError(err.response?.data?.message || t("updateFailed"));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressError(""); setAddressMessage(""); setAddressSaving(true);
    try {
      const { data } = await updateAddress(address);
      setUser(data);
      setAddressMessage(t("addressUpdated"));
    } catch (err) {
      setAddressError(err.response?.data?.message || t("updateFailed"));
    } finally {
      setAddressSaving(false);
    }
  };

  const handleNotificationsToggle = async (e) => {
    const notificationsEnabled = e.target.checked;
    setNotifError(""); setNotifSaving(true);
    setUser((u) => ({ ...u, notificationsEnabled }));
    try {
      const { data } = await updateProfile({ notificationsEnabled });
      setUser(data);
    } catch (err) {
      setUser((u) => ({ ...u, notificationsEnabled: !notificationsEnabled }));
      setNotifError(err.response?.data?.message || t("updateFailed"));
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 24px 64px" }}>
      <span className="eyebrow">{t("title")}</span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontStyle: "italic", marginTop: 4 }}>
        {t("title")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("subtitle")}</p>
      <div className="divider-gold">✦</div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          {t("profileTitle")}
        </p>

        {profileMessage && (
          <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0", display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> {profileMessage}
          </div>
        )}
        {profileError && (
          <div style={{ background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" }}>
            {profileError}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <label className="form-label">
            {t("fullName")}
            <input className="input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} required />
          </label>
          <label className="form-label">
            {t("phoneNumber")}
            <input className="input" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
          </label>
          <label className="form-label">
            {t("preferredLanguage")}
            <select className="input" value={profile.preferredLanguage} onChange={(e) => setProfile((p) => ({ ...p, preferredLanguage: e.target.value }))}>
              <option value="en">{t("english")}</option>
              <option value="bn">{t("bengali")}</option>
            </select>
          </label>
          <button className="btn btn-gold" type="submit" disabled={profileSaving} style={{ padding: "10px 20px", fontSize: 13 }}>
            {profileSaving ? t("savingProfile") : t("saveProfile")}
          </button>
        </form>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
          {t("addressTitle")}
        </p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{t("addressNote")}</p>

        {addressMessage && (
          <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #A7F3D0", display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> {addressMessage}
          </div>
        )}
        {addressError && (
          <div style={{ background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" }}>
            {addressError}
          </div>
        )}

        <form onSubmit={handleAddressSubmit}>
          <label className="form-label">
            {t("streetAddress")}
            <input className="input" value={address.addressLine} onChange={(e) => setAddress((a) => ({ ...a, addressLine: e.target.value }))} required />
          </label>
          <label className="form-label">
            {t("district")}
            <select className="input" value={address.district} onChange={(e) => setAddress((a) => ({ ...a, district: e.target.value }))} required>
              <option value="">{t("selectDistrict")}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="form-label">
            {t("city")}
            <input className="input" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} required />
          </label>
          <label className="form-label">
            {t("addressPhone")}
            <input className="input" value={address.phone} onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))} required />
          </label>
          <button className="btn btn-gold" type="submit" disabled={addressSaving} style={{ padding: "10px 20px", fontSize: 13 }}>
            {addressSaving ? t("savingAddress") : t("saveAddress")}
          </button>
        </form>
      </div>

      <div className="panel">
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
          {t("notificationsTitle")}
        </p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{t("notificationsDesc")}</p>

        {notifError && (
          <div style={{ background: "#FEF2F2", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16, fontSize: 13, border: "1px solid #FECACA" }}>
            {notifError}
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={!!user?.notificationsEnabled}
            onChange={handleNotificationsToggle}
            disabled={notifSaving}
          />
          {t("emailNotificationsLabel")}
        </label>
      </div>
    </div>
  );
}
