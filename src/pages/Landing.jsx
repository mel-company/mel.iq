import { Link } from 'react-router-dom'

function Landing() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-black dark:bg-white text-white dark:text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6">
              مرحباً بك في منصة ميل.IQ
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-gray-300 dark:text-gray-700 max-w-3xl mx-auto">
              اكتشف الخطة المثالية لاحتياجاتك. اختر من بين خيارات الاشتراك المرنة المصممة لمساعدتك على النجاح.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/checkout"
                className="bg-white dark:bg-black text-black dark:text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors shadow-lg"
              >
                ابدأ الآن
              </Link>
              <Link
                to="/pricing"
                className="bg-gray-900 dark:bg-gray-100 text-white dark:text-black px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors border-2 border-white dark:border-black"
              >
                عرض الخطط
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-black transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-black dark:text-white">
            لماذا ميل.IQ؟
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-900 hover:shadow-lg transition-all border border-gray-200 dark:border-gray-800">
              <div className="bg-gray-200 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">سريع وموثوق</h3>
              <p className="text-gray-600 dark:text-gray-400">أداء سريع للغاية مع ضمان عمل بنسبة 99.9%</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-900 hover:shadow-lg transition-all border border-gray-200 dark:border-gray-800">
              <div className="bg-gray-200 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">آمن</h3>
              <p className="text-gray-600 dark:text-gray-400">أمان على مستوى المؤسسات لحماية بياناتك</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-900 hover:shadow-lg transition-all border border-gray-200 dark:border-gray-800">
              <div className="bg-gray-200 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">دعم 24/7</h3>
              <p className="text-gray-600 dark:text-gray-400">دعم العملاء على مدار الساعة طوال أيام الأسبوع</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black dark:bg-white text-white dark:text-black transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">هل أنت مستعد للبدء؟</h2>
          <p className="text-xl mb-8 text-gray-300 dark:text-gray-700">اختر الخطة المثالية التي تناسب احتياجاتك اليوم</p>
          <Link
            to="/checkout"
            className="bg-white dark:bg-black text-black dark:text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors inline-block"
          >
            ابدأ الآن
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Landing

