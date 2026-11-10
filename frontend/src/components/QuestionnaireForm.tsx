import type { Questionnaire } from "@/lib/types";

const SYMPTOMS: { id: string; label: string }[] = [
  { id: "bumps", label: "Bumps or growths" }, { id: "ulcer_sore", label: "Ulcer or open sore" },
  { id: "blister", label: "Blisters" }, { id: "rash", label: "Rash or redness" },
  { id: "itching", label: "Itching" }, { id: "discharge", label: "Discharge" },
  { id: "pain_urination", label: "Pain when urinating" }, { id: "bleeding", label: "Bleeding" },
  { id: "swelling", label: "Swelling" }, { id: "fever", label: "Fever / feeling unwell" },
  { id: "none", label: "No symptoms" },
];

export const EMPTY_Q: Questionnaire = {
  age: null, sex_at_birth: null, symptoms: [], duration: null, pain: false, itching: false,
  changed: false, fever: false, exposure: null, partner_sti: false, prior_sti: false, notes: "",
};

export default function QuestionnaireForm({ value, onChange }: { value: Questionnaire; onChange: (q: Questionnaire) => void }) {
  const set = (patch: Partial<Questionnaire>) => onChange({ ...value, ...patch });
  const toggle = (id: string) => {
    let s = value.symptoms.includes(id) ? value.symptoms.filter((x) => x !== id) : [...value.symptoms, id];
    if (id === "none") s = s.includes("none") ? ["none"] : [];
    else s = s.filter((x) => x !== "none");
    set({ symptoms: s, itching: s.includes("itching"), fever: s.includes("fever") });
  };
  const chip = (on: boolean) => `chip ${on ? "bg-royal text-white border-royal" : "bg-white text-ink-soft border-border hover:border-royal/50"}`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Age</label>
          <input className="input" type="number" min={12} max={110} placeholder="e.g. 26" value={value.age ?? ""}
            onChange={(e) => set({ age: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div>
          <label className="label">Sex at birth</label>
          <select className="input" value={value.sex_at_birth ?? ""} onChange={(e) => set({ sex_at_birth: (e.target.value || null) as Questionnaire["sex_at_birth"] })}>
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="intersex">Intersex</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">What have you noticed? (select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <button type="button" key={s.id} className={chip(value.symptoms.includes(s.id))} onClick={() => toggle(s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">How long has it been there?</label>
          <div className="flex flex-wrap gap-2">
            {([["<1w", "Under a week"], ["1-4w", "1–4 weeks"], [">4w", "Over 4 weeks"], ["unknown", "Not sure"]] as const).map(([v, l]) => (
              <button type="button" key={v} className={chip(value.duration === v)} onClick={() => set({ duration: v })}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Recent sexual contact</label>
          <div className="flex flex-wrap gap-2">
            {([["none", "None recently"], ["protected", "Protected"], ["unprotected", "Unprotected"], ["unknown", "Prefer not to say"]] as const).map(([v, l]) => (
              <button type="button" key={v} className={chip(value.exposure === v)} onClick={() => set({ exposure: v })}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(value.pain)} onClick={() => set({ pain: !value.pain })}>Painful</button>
        <button type="button" className={chip(value.changed)} onClick={() => set({ changed: !value.changed })}>Changing / growing</button>
        <button type="button" className={chip(value.partner_sti)} onClick={() => set({ partner_sti: !value.partner_sti })}>A partner was diagnosed with an STI</button>
        <button type="button" className={chip(value.prior_sti)} onClick={() => set({ prior_sti: !value.prior_sti })}>Previous STI</button>
      </div>

      <div>
        <label className="label">Anything else (optional)</label>
        <textarea className="input min-h-[72px]" maxLength={1000} placeholder="Describe it in your own words – no names or contact details needed."
          value={value.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
    </div>
  );
}
