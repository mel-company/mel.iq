import GenerationProgress from "../components/ai/GenerationProgress";

export default function DevProgressPreview() {
  return (
    <div className="min-h-dvh bg-[#0b0f2b]">
      <GenerationProgress
        open
        storeName="متجر النخبة"
        phase="design"
        entries={[
          { message: "جاري رفع الصور المرجعية…", done: true },
          { message: "جاري تحليل المعلومات واستخراج هوية متجرك…", done: false },
        ]}
        steps={[
          { key: "refs", label: "جاري رفع الصور المرجعية…", weight: 1 },
          { key: "design", label: "جاري تصميم المتجر…", weight: 1 },
          { key: "identity", label: "جاري تحديد هوية المتجر…", weight: 1 },
          { key: "home", label: "جاري تجهيز الصفحة الرئيسية…", weight: 1 },
        ]}
        activeStep={1}
      />
    </div>
  );
}
