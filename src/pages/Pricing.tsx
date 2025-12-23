import { Link } from "react-router-dom";
import { useFetchAllPlans } from "@/api/wrappers/plan.wrappers";
import { Skeleton } from "@/components/ui/skeleton";

function Pricing() {
  const plans = useFetchAllPlans();
  if (plans.isLoading)
    return (
      <div>
        <Skeleton className="w-full h-full" />
      </div>
    );
  if (plans.isError) return <div>Error: {plans.error.message}</div>;
  // Handle different response structures
  const plansData = Array.isArray(plans.data)
    ? plans.data
    : plans.data?.data || plans.data?.plans || [];

  return (
    <div className="w-full py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-black dark:text-white mb-4">
            اختر خطتك
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            اختر خطة الاشتراك المثالية التي تناسب احتياجاتك. جميع الخطط تشمل
            فترة تجريبية مجانية لمدة 14 يوماً.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {plansData &&
            Array.isArray(plansData) &&
            plansData.map((plan: any) => (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-black rounded-2xl shadow-lg p-8 transition-all border-2 ${
                  plan.most_popular
                    ? "border-black dark:border-white transform scale-105"
                    : "border-gray-200 dark:border-gray-800 hover:border-black dark:hover:border-white"
                }`}
              >
                {plan.most_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-black dark:bg-white text-white dark:text-black px-4 py-1 rounded-full text-sm font-semibold">
                      الأكثر شعبية
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
                    {plan.name || ""}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {plan.description || ""}
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-extrabold text-black dark:text-white">
                        {plan.monthly_price
                          ? plan.monthly_price.toLocaleString("en-IQ")
                          : "0"}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 mr-2">
                        د.ع
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500">
                      /شهرياً
                    </div>
                    {plan.yearly_price && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        أو {plan.yearly_price.toLocaleString("en-IQ")} د.ع
                        سنوياً
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features &&
                    Array.isArray(plan.features) &&
                    plan.features
                      .filter((feature: any) => feature.enabled !== false)
                      .map((feature: any) => (
                        <li key={feature.id} className="flex items-start">
                          <svg
                            className="w-6 h-6 mr-3 shrink-0 mt-0.5 text-black dark:text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <div className="flex-1">
                            <span className="text-gray-700 dark:text-gray-300 font-medium block">
                              {feature.name || ""}
                            </span>
                            {feature.description && (
                              <span className="text-gray-500 dark:text-gray-500 text-sm block mt-1">
                                {feature.description}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                </ul>

                <Link
                  to="/checkout"
                  state={{ selectedPlan: plan }}
                  className="w-full py-3 px-6 rounded-lg font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-center block"
                >
                  ابدأ الآن
                </Link>
              </div>
            ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-black dark:text-white mb-12">
            الأسئلة الشائعة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-black p-6 rounded-lg shadow border border-gray-200 dark:border-gray-800 transition-all">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                هل يمكنني تغيير الخطط لاحقاً؟
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                نعم، يمكنك ترقية أو خفض خطتك في أي وقت. التغييرات سارية فوراً.
              </p>
            </div>
            <div className="bg-white dark:bg-black p-6 rounded-lg shadow border border-gray-200 dark:border-gray-800 transition-all">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                هل هناك فترة تجريبية مجانية؟
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                جميع الخطط تشمل فترة تجريبية مجانية لمدة 14 يوماً. لا حاجة
                لبطاقة ائتمانية للبدء.
              </p>
            </div>
            <div className="bg-white dark:bg-black p-6 rounded-lg shadow border border-gray-200 dark:border-gray-800 transition-all">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                ما هي طرق الدفع المقبولة؟
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                نقبل جميع البطاقات الائتمانية الرئيسية، PayPal، والتحويلات
                المصرفية للخطط المؤسسية.
              </p>
            </div>
            <div className="bg-white dark:bg-black p-6 rounded-lg shadow border border-gray-200 dark:border-gray-800 transition-all">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                هل يمكنني الإلغاء في أي وقت؟
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                نعم، يمكنك إلغاء اشتراكك في أي وقت. لا توجد رسوم إلغاء أو
                غرامات.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;
