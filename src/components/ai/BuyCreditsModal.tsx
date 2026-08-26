import { useEffect, useState } from "react";
import { X, Loader2, Sparkles, Store, PenLine } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCreditPackages,
  usePurchaseCredits,
  aiGeneratorKeys,
} from "@/api/wrappers/aiStoreGenerator.wrappers";

interface BuyCreditsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BuyCreditsModal({ open, onClose }: BuyCreditsModalProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: packages, isLoading } = useCreditPackages(open);
  const purchase = usePurchaseCredits();

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  const handleBuy = async (packId: string) => {
    setSelected(packId);
    try {
      await purchase.mutateAsync(packId);
      toast.success("تم شحن الرصيد بنجاح");
      queryClient.invalidateQueries({ queryKey: aiGeneratorKeys.credits() });
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "تعذر إكمال عملية الشراء");
    } finally {
      setSelected(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0F1014] border border-white/10 p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-1 rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold">اشحن رصيد الذكاء الاصطناعي</h2>
          <p className="text-sm text-white/60 mt-1">
            اختر الباقة التي تناسبك وابدأ إنشاء المتاجر فوراً
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        )}

        {!isLoading && (
          <div className="grid gap-3">
            {packages?.map((pack) => (
              <button
                key={pack.id}
                disabled={purchase.isPending}
                onClick={() => handleBuy(pack.id)}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-right hover:bg-white/10 hover:border-amber-500/50 transition-all disabled:opacity-50"
              >
                <div className="flex-1">
                  <div className="font-medium text-base">{pack.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/70">
                    {pack.generations > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Store size={14} />
                        {pack.generations} متجر
                      </span>
                    )}
                    {pack.editor > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <PenLine size={14} />
                        {pack.editor} تعديل
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left ml-4">
                  <div className="text-lg font-bold text-amber-400">
                    {pack.price.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-white/60">
                      {pack.currency}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">اشترِ الآن</div>
                </div>
                {selected === pack.id && purchase.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                )}
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-white/40 mt-6">
          الرصيد المشترى لا ينتهي ويُستخدم قبل الرصيد المجاني.
        </p>
      </div>
    </div>
  );
}
