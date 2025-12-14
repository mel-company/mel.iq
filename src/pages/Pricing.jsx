import { Link } from 'react-router-dom'

function Pricing() {
  const plans = [
    {
      name: 'Basic',
      price: '$9.99',
      period: '/month',
      description: 'Perfect for individuals getting started',
      features: [
        '10GB Storage',
        'Basic Support',
        '5 Projects',
        'Email Support',
        'Mobile App Access'
      ],
      popular: false,
      color: 'indigo'
    },
    {
      name: 'Professional',
      price: '$29.99',
      period: '/month',
      description: 'Best for growing businesses',
      features: [
        '100GB Storage',
        'Priority Support',
        'Unlimited Projects',
        '24/7 Phone Support',
        'Advanced Analytics',
        'Team Collaboration',
        'API Access'
      ],
      popular: true,
      color: 'purple'
    },
    {
      name: 'Enterprise',
      price: '$99.99',
      period: '/month',
      description: 'For large organizations',
      features: [
        '1TB Storage',
        'Dedicated Support',
        'Unlimited Everything',
        'Custom Integrations',
        'SLA Guarantee',
        'Advanced Security',
        'Custom Training',
        'Account Manager'
      ],
      popular: false,
      color: 'pink'
    }
  ]

  return (
    <div className="w-full py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-black dark:text-white mb-4">
            اختر خطتك
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            اختر خطة الاشتراك المثالية التي تناسب احتياجاتك. جميع الخطط تشمل فترة تجريبية مجانية لمدة 14 يوماً.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white dark:bg-black rounded-2xl shadow-lg p-8 transition-all border-2 ${plan.popular
                ? 'border-black dark:border-white transform scale-105'
                : 'border-gray-200 dark:border-gray-800 hover:border-black dark:hover:border-white'
                }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-black dark:bg-white text-white dark:text-black px-4 py-1 rounded-full text-sm font-semibold">
                    الأكثر شعبية
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-black dark:text-white mb-2">{plan.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-extrabold text-black dark:text-white">{plan.price}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <svg
                      className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5 text-black dark:text-white"
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
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
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
                جميع الخطط تشمل فترة تجريبية مجانية لمدة 14 يوماً. لا حاجة لبطاقة ائتمانية للبدء.
              </p>
            </div>
            <div className="bg-white dark:bg-black p-6 rounded-lg shadow border border-gray-200 dark:border-gray-800 transition-all">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                ما هي طرق الدفع المقبولة؟
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                نقبل جميع البطاقات الائتمانية الرئيسية، PayPal، والتحويلات المصرفية للخطط المؤسسية.
              </p>
            </div>
            <div className="bg-white dark:bg-black p-6 rounded-lg shadow border border-gray-200 dark:border-gray-800 transition-all">
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                هل يمكنني الإلغاء في أي وقت؟
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                نعم، يمكنك إلغاء اشتراكك في أي وقت. لا توجد رسوم إلغاء أو غرامات.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pricing

