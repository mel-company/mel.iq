import { useState } from 'react'

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
    alert('شكراً لرسالتك! سنعود إليك قريباً.')
    setFormData({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <div className="w-full py-12 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            اتصل بنا
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            لديك سؤال؟ نحب أن نسمع منك. أرسل لنا رسالة وسنرد في أقرب وقت ممكن.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white dark:bg-black rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 transition-colors duration-200">
            <h2 className="text-2xl font-bold text-black dark:text-white mb-6">أرسل لنا رسالة</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  الاسم
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                  placeholder="اسمك"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  الموضوع
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                  placeholder="ما هو الموضوع؟"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  الرسالة
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition resize-none"
                  placeholder="رسالتك هنا..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black dark:bg-white text-white dark:text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                إرسال الرسالة
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-black rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 transition-colors duration-200">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6">معلومات الاتصال</h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-black dark:text-white mb-1">البريد الإلكتروني</h3>
                    <p className="text-gray-600 dark:text-gray-400">support@mel.iq</p>
                    <p className="text-gray-600 dark:text-gray-400">info@mel.iq</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-black dark:text-white mb-1">الهاتف</h3>
                    <p className="text-gray-600 dark:text-gray-400">+1 (555) 123-4567</p>
                    <p className="text-gray-600 dark:text-gray-400">الإثنين - الجمعة 9ص - 6م</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-black dark:text-white mb-1">العنوان</h3>
                    <p className="text-gray-600 dark:text-gray-400">123 شارع الأعمال</p>
                    <p className="text-gray-600 dark:text-gray-400">المكتب 100</p>
                    <p className="text-gray-600 dark:text-gray-400">نيويورك، نيويورك 10001</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Hours */}
            <div className="bg-black dark:bg-white rounded-2xl p-8 text-white dark:text-black border-2 border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-bold mb-4">ساعات الدعم</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>الإثنين - الجمعة</span>
                  <span className="font-semibold">9:00 ص - 6:00 م</span>
                </div>
                <div className="flex justify-between">
                  <span>السبت</span>
                  <span className="font-semibold">10:00 ص - 4:00 م</span>
                </div>
                <div className="flex justify-between">
                  <span>الأحد</span>
                  <span className="font-semibold">مغلق</span>
                </div>
              </div>
              <p className="mt-4 text-gray-300 dark:text-gray-700">
                للعملاء المؤسسيين، دعم متاح على مدار الساعة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact