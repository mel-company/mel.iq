import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Templates() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedType, setSelectedType] = useState(location.state?.websiteType || 'store')

  const storeTemplates = [
    { id: 1, name: 'قالب متجر حديث', icon: '🛍️', description: 'تصميم عصري للمتاجر', price: 29.99, preview: 'modern' },
    { id: 2, name: 'قالب متجر فاخر', icon: '💎', description: 'لمنتجات فاخرة', price: 49.99, preview: 'luxury' },
    { id: 3, name: 'قالب متجر بسيط', icon: '📦', description: 'تصميم بسيط وأنيق', price: 19.99, preview: 'simple' },
    { id: 4, name: 'قالب متجر ملون', icon: '🌈', description: 'ألوان جذابة', price: 34.99, preview: 'colorful' },
    { id: 5, name: 'قالب متجر مينيمال', icon: '✨', description: 'تصميم بسيط', price: 24.99, preview: 'minimal' },
    { id: 6, name: 'قالب متجر احترافي', icon: '🏆', description: 'للأعمال الكبيرة', price: 79.99, preview: 'professional' }
  ]

  const restaurantTemplates = [
    { id: 1, name: 'منيو كلاسيكي', icon: '🍽️', description: 'تصميم تقليدي أنيق', price: 29.99, preview: 'classic' },
    { id: 2, name: 'منيو عصري', icon: '🍕', description: 'عصري وجذاب', price: 34.99, preview: 'modern' },
    { id: 3, name: 'منيو فاخر', icon: '🍷', description: 'للمطاعم الفاخرة', price: 49.99, preview: 'luxury' },
    { id: 4, name: 'منيو سريع', icon: '🍔', description: 'للمأكولات السريعة', price: 24.99, preview: 'fast' },
    { id: 5, name: 'منيو ملون', icon: '🍰', description: 'ألوان شهية', price: 29.99, preview: 'colorful' },
    { id: 6, name: 'منيو مخصص', icon: '🍜', description: 'قابل للتخصيص', price: 59.99, preview: 'custom' }
  ]

  const templates = selectedType === 'store' ? storeTemplates : restaurantTemplates

  const handlePurchase = (template) => {
    // Simulate purchase and download
    alert(`تم شراء ${template.name} بنجاح! سيتم تحميل القالب الآن.`)
    // Simulate download
    const link = document.createElement('a')
    link.href = `#template-${template.id}`
    link.download = `${template.name}.zip`
    link.click()
  }

  return (
    <div className="w-full min-h-screen py-20 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-black dark:text-white mb-4">
            قوالب {selectedType === 'store' ? 'المتاجر' : 'المطاعم'}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            اختر القالب المثالي لموقعك
          </p>
        </div>

        {/* Type Selector */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-lg border-2 border-gray-200 dark:border-gray-800 p-1">
            <button
              onClick={() => setSelectedType('store')}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${selectedType === 'store'
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
            >
              متاجر إلكترونية 🛍️
            </button>
            <button
              onClick={() => setSelectedType('restaurant')}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${selectedType === 'restaurant'
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
            >
              منيو مطاعم 🍽️
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-black rounded-xl border-2 border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl transition-all group"
            >
              <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-lg mb-4 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="text-8xl">{template.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                {template.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {template.description}
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-extrabold text-black dark:text-white">
                  ${template.price}
                </span>
                <button
                  onClick={() => handlePurchase(template)}
                  className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  شراء
                </button>
              </div>
              <button
                className="w-full text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm font-medium transition-colors"
              >
                معاينة القالب →
              </button>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Link
            to={user ? '/dashboard' : '/'}
            className="inline-block bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white px-6 py-3 rounded-lg font-semibold transition-colors border border-gray-200 dark:border-gray-800"
          >
            {user ? 'العودة للوحة التحكم' : 'العودة للصفحة الرئيسية'}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Templates