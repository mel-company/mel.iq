import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-950 dark:to-gray-900 px-4">
      
      <div className="max-w-xl w-full text-center space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="mel.iq"
              className="w-65 h-40"
            />
        </div>

        {/* 404 */}
        <div className="space-y-3">
         

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            الصفحة غير موجودة
          </h2>

          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            يبدو أن الصفحة التي تحاول الوصول إليها غير موجودة أو تم نقلها.
            يمكنك العودة إلى الصفحة الرئيسية أو الذهاب إلى لوحة التحكم.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">

          <Link
            to="/"
            className="px-6 py-3 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-700 transition shadow"
          >
            العودة للصفحة الرئيسية
          </Link>

          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            الذهاب للوحة التحكم
          </Link>

        </div>

      </div>
    </div>
  );
}

export default NotFound;