import { useState } from "react";
import { BookOpen, MessageCircle, Phone, Send } from "../icons";
import { toast } from "sonner";
import SectionEyebrow from "./SectionEyebrow";

const MESSAGE_MAX = 500;

/** The panel ground the form and every channel card share. */
const PANEL =
  "linear-gradient(90deg, rgba(27,24,65,0.05) 0%, rgba(166,140,240,0.05) 52%, rgba(27,24,65,0.05) 100%), " +
  "linear-gradient(90deg, #06031f 0%, #06031f 100%)";

const CHANNELS = [
  {
    action: "ابدأ المحادثة",
    title: "دردشة مباشرة",
    detail: "فريق الدعم متاح 24/7 بالعربية",
    icon: MessageCircle,
    tint: "bg-brand-primary/10 text-brand-primary",
  },
  {
    action: "تصفح المقالات",
    title: "مركز المساعدة",
    detail: "أدلة وشروحات بالفيديو لكل ميزة",
    icon: BookOpen,
    tint: "bg-brand-secondary/10 text-brand-secondary",
  },
  {
    action: "اتصل الآن",
    title: "اتصل بنا",
    detail: "+964 770 123 4567 — السبت إلى الخميس",
    icon: Phone,
    tint: "bg-mint/10 text-mint",
  },
];

/** A labelled input. The design gives every field a muted label above it and
 *  an optional hint below, so both are part of the field rather than ad hoc. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  // `w-full` rather than `items-end`: an end-aligned column shrinks its
  // children to their content, which collapsed every input to the width of
  // its placeholder.
  return (
    <label className="flex w-full flex-1 flex-col gap-1 text-right">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const INPUT =
  "w-full rounded-[14px] bg-slate px-4 py-3.5 text-sm text-white placeholder:text-[#4a5596] outline-none transition-shadow focus:ring-2 focus:ring-brand-primary/40";

/** "تواصل معنا" — the message form beside the three support channels. */
function ContactSection() {
  const [form, setForm] = useState({
    phone: "",
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // There is no messages endpoint yet — the same place the standalone
    // contact page stops. The form validates and acknowledges, and wiring it
    // up is a single call once the endpoint exists.
    toast.success("تم استلام رسالتك، سنرد عليك خلال يوم عمل واحد");
    setForm({ phone: "", name: "", email: "", subject: "", message: "" });
  };

  return (
    <section id="contact" className="relative px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto flex max-w-[1296px] flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-6">
          <div data-reveal>
            <SectionEyebrow>تواصل معنا</SectionEyebrow>
          </div>
          <p
            data-reveal
            className="text-prose-lg max-w-[1181px] text-center"
            style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
          >
            فريقنا في بغداد جاهز للإجابة عن أسئلتك ومساعدتك في إطلاق متجرك عادةً
            نرّد خلال أقل من ساعة.
          </p>
        </div>

        <div className="flex w-full max-w-[1248px] flex-col gap-8 lg:flex-row-reverse lg:items-start">
          <form
            onSubmit={handleSubmit}
            data-reveal
            className="flex flex-1 flex-col gap-4 rounded-[18px] p-6 sm:p-8"
            style={{ backgroundImage: PANEL }}
          >
            <div className="flex w-full flex-col pb-2 text-right">
              <h3 className="text-base font-bold text-frost">أرسل لنا رسالة</h3>
              <p className="text-xs text-muted">سنرد على بريدك خلال يوم عمل واحد</p>
            </div>

            {/* RTL flow: the first child sits on the right, which is where
                the design puts the name field. */}
            <div className="flex w-full flex-col gap-4 sm:flex-row">
              <Field label="الاسم الكامل">
                <input
                  required
                  value={form.name}
                  onChange={set("name")}
                  placeholder="محمد علي يوسف"
                  className={`${INPUT} text-right`}
                />
              </Field>
              <Field label="رقم الهاتف" hint="اختياري — للتواصل السريع عبر واتساب">
                <input
                  type="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+964 7XX XXX XXXX"
                  className={INPUT}
                />
              </Field>
            </div>

            <Field label="البريد الإلكتروني">
              <input
                type="email"
                required
                dir="ltr"
                value={form.email}
                onChange={set("email")}
                placeholder="you@store.iq"
                className={INPUT}
              />
            </Field>

            <Field label="الموضوع">
              <input
                required
                value={form.subject}
                onChange={set("subject")}
                placeholder="استفسار عن الأسعار"
                className={`${INPUT} text-right`}
              />
            </Field>

            <Field label="رسالتك">
              <textarea
                required
                rows={5}
                maxLength={MESSAGE_MAX}
                value={form.message}
                onChange={set("message")}
                placeholder="اكتب تفاصيل طلبك هنا…"
                className={`${INPUT} h-[120px] resize-none text-right`}
              />
            </Field>
            <p dir="ltr" className="-mt-3 w-full text-start text-xs text-muted">
              {form.message.length}/{MESSAGE_MAX}
            </p>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-l from-brand-violet to-brand-indigo px-3.5 py-4 text-[15px] font-bold text-white transition-opacity hover:opacity-90"
            >
              إرسال الرسالة
              <Send size={18} />
            </button>
          </form>

          <div className="flex w-full flex-col gap-4 lg:w-[40%]">
            {CHANNELS.map((channel, i) => (
              <button
                key={channel.title}
                type="button"
                data-reveal
                className="card-hover flex items-center gap-4 rounded-[18px] p-5 text-right"
                style={{
                  backgroundImage: PANEL,
                  "--reveal-delay": `${120 + i * 100}ms`,
                } as React.CSSProperties}
              >
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${channel.tint}`}
                >
                  <channel.icon size={22} />
                </span>
                <span className="flex flex-1 flex-col gap-0.5 text-right">
                  <span className="text-sm font-bold text-frost">{channel.title}</span>
                  <span className="text-xs text-muted">{channel.detail}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-brand-primary">
                  {channel.action}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
