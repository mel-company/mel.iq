function About() {
  return (
    <div className="w-full py-20 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-black dark:text-white mb-4">
            حول ميل.IQ
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            نحن ملتزمون بتقديم حلول مبتكرة تساعد الشركات والأفراد على تحقيق أهدافهم.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-black dark:text-white mb-4">مهمتنا</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                في ميل.IQ، نؤمن بجعل الأدوات القوية في متناول الجميع. مهمتنا هي تمكين الأفراد والشركات بتقنيات متطورة تقود النجاح.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                نحن ملتزمون بتقديم قيمة استثنائية وخدمة عملاء متميزة وحلول مبتكرة تتطور مع احتياجاتك.
              </p>
            </div>
            <div className="bg-black dark:bg-white rounded-2xl p-8 text-white dark:text-black transition-colors duration-200 border-2 border-gray-200 dark:border-gray-800">
              <h3 className="text-2xl font-bold mb-4">قيمنا</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>الابتكار والتميز</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>نهج يركز على العملاء</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>الشفافية والثقة</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>التحسين المستمر</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-black dark:bg-white rounded-2xl p-12 mb-20 text-white dark:text-black transition-colors duration-200 border-2 border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-extrabold mb-2">10K+</div>
              <div className="text-gray-300 dark:text-gray-700">عميل سعيد</div>
            </div>
            <div>
              <div className="text-5xl font-extrabold mb-2">99.9%</div>
              <div className="text-gray-300 dark:text-gray-700">ضمان عمل</div>
            </div>
            <div>
              <div className="text-5xl font-extrabold mb-2">24/7</div>
              <div className="text-gray-300 dark:text-gray-700">دعم متاح</div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section>
          <h2 className="text-3xl font-bold text-center text-black dark:text-white mb-12">قصتنا</h2>
          <div className="max-w-3xl mx-auto">
            <div className="prose prose-lg mx-auto text-gray-600 dark:text-gray-400">
              <p className="mb-4">
                تأسست ميل.IQ برؤية بسيطة: جعل أدوات الأعمال القوية في متناول الجميع، بغض النظر عن حجمهم أو ميزانيتهم. بدأنا كفريق صغير من المطورين والمصممين المتحمسين الذين كانوا محبطين من تعقيد وتكلفة الحلول الموجودة.
              </p>
              <p className="mb-4">
                اليوم، نمونا لتصبح منصة موثوقة تخدم آلاف العملاء في جميع أنحاء العالم. التزامنا بالابتكار ورضا العملاء والتحسين المستمر جعلنا رائدين في صناعتنا.
              </p>
              <p>
                نتطور باستمرار، نضيف ميزات جديدة، ونحسن خدماتنا بناءً على ملاحظات مجتمعنا الرائع. انضم إلينا في هذه الرحلة واختبر الفرق الذي يمكن أن تحدثه mel.iq لعملك.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default About

