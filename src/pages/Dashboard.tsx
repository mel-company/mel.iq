import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleCreateNewStore = () => {
    // Navigate to checkout with user info and skip to step 3
    navigate('/checkout', {
      state: {
        skipToStep: 3,
        userInfo: {
          name: user?.name,
          email: user?.email,
          phone: user?.phone || ''
        }
      }
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white">
                مرحباً، {user?.name}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-800"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-black dark:text-white">
              متاجري ({user?.stores?.length || 0})
            </h2>
            <button
              onClick={handleCreateNewStore}
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              + إنشاء متجر جديد
            </button>
          </div>

          {user?.stores && user.stores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.stores.map((store, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-black dark:text-white">
                      {store.name || `متجر ${index + 1}`}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${store.type === 'store'
                      ? 'bg-gray-100 dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-800'
                      : 'bg-gray-100 dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-800'
                      }`}>
                      {store.type === 'store' ? 'متجر 🛍️' : 'مطعم 🍽️'}
                    </span>
                  </div>
                  {store.url && (
                    <a
                      href={store.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black dark:text-white hover:underline text-sm font-mono mb-4 block break-all"
                    >
                      {store.url}
                    </a>
                  )}
                  {store.url && (
                    <div className="mb-4 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                      <iframe
                        src={store.url}
                        className="w-full h-96"
                        title={`معاينة ${store.name}`}
                        frameBorder="0"
                        allow="fullscreen"
                      />
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-800">
                      إدارة
                    </button>
                    {store.url && (
                      <a
                        href={store.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
                      >
                        فتح في نافذة جديدة
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800">
              <div className="text-6xl mb-4">🛍️</div>
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                لا يوجد متاجر
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                ابدأ بإنشاء متجرك الأول الآن
              </p>
              <button
                onClick={handleCreateNewStore}
                className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-lg font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
              >
                إنشاء متجر جديد
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard